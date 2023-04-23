import { exec } from 'child_process';
import { inspect } from 'util';

import { HardhatUserConfig, task } from 'hardhat/config';
// import '@oasisprotocol/sapphire-hardhat';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-watcher';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';

import { NFTrout } from './src/index';

const accounts = process.env.PRIVATE_KEY
  ? [process.env.PRIVATE_KEY]
  : process.env.MNEMONIC
  ? { mnemonic: process.env.MNEMONIC }
  : [];

task('accounts').setAction(async (_, hre) => {
  const { ethers } = hre;
  const signers = await ethers.getSigners();
  const balances = await Promise.all(signers.map((s) => ethers.provider.getBalance(s.address)));
  for (let i = 0; i < signers.length; i++) {
    let num: string | number;
    try {
      num = balances[i].toNumber();
    } catch {
      num = ethers.utils.formatEther(balances[i]);
    }
    console.log(signers[i].address, num);
  }
});

task('mint').setAction(async (_, hre) => {
  const { ethers } = hre;
  const [{ address: minter }] = await ethers.getSigners();
  const nftrout = (await ethers.getContract('NFTrout')) as NFTrout;
  const tx = await nftrout.mint({ value: await nftrout.callStatic.getBreedingFee(minter, 0, 0) });
  const receipt = await tx.wait();
  for (const event of receipt.events!) {
    if (event.event !== 'Transfer') continue;
    console.log(ethers.BigNumber.from(receipt.events![0].topics[3]).toNumber());
    break;
  }
});

task('breed')
  .addPositionalParam('left')
  .addPositionalParam('right')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout')) as NFTrout;
    const [{ address: breeder }] = await ethers.getSigners();
    const breedingFee = await nftrout.callStatic.getBreedingFee(breeder, args.left, args.right);
    const tx = await nftrout.breed(args.left, args.right, {
      value: breedingFee,
    });
    console.log(tx.hash);
    const receipt = await tx.wait();
    for (const event of receipt.events!) {
      if (event.event !== 'Transfer') continue;
      console.log(ethers.BigNumber.from(receipt.events![0].topics[3]).toNumber());
      break;
    }
  });

type Config = {
  gasKey: string;
  chainId: number;
  nftStorageKey: string;
};

task('invoke-spawner').setAction(async (_, hre) => {
  const { ethers } = hre;

  const gasKey = process.env.GAS_KEY;
  if (!gasKey) throw new Error('missing GAS_KEY');
  const nftStorageKey = process.env.NFT_STORAGE_KEY;
  if (!nftStorageKey) throw new Error('missing NFT_STORAGE_KEY');
  const chainId = hre.network.config.chainId!;

  const config = { gasKey, chainId, nftStorageKey };

  const nftrout = (await ethers.getContract('NFTrout')) as NFTrout;

  const totalSupply = (await nftrout.callStatic.totalSupply()).toNumber();

  const cidCache = new Map();

  const needsSpawning = [];
  for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
    needsSpawning.push(
      (async () => {
        const existingCid = await getTroutCid(cidCache, nftrout, tokenId);
        return existingCid ? undefined : tokenId;
      })(),
    );
  }

  const taskIds: number[] = [];
  const cids: string[] = [];

  for (const tokenId of await Promise.all(needsSpawning)) {
    if (tokenId === undefined) continue;
    let cid = '';
    try {
      cid = await spawnTrout(nftrout, tokenId, config, cidCache);
    } catch (e: any) {
      console.error(inspect(e, undefined, 10, true));
      break; // Post the completed ones.
    }
    taskIds.push(tokenId);
    cids.push(cid);
  }

  const encodedCids = ethers.utils.defaultAbiCoder.encode(['string[]'], [cids]);
  const tx = await nftrout.acceptTaskResults(taskIds, [], encodedCids);
  const receipt = await tx.wait();
  if (receipt.status !== 1) throw new Error('failed to accept tasks');
});

/// Returns the trout CID.
async function spawnTrout(
  nftrout: NFTrout,
  tokenId: number,
  config: Config,
  cidCache: Map<number, string> = new Map(),
): Promise<string> {
  const { left, right } = await nftrout.callStatic.parents(tokenId);

  let leftCid = '';
  let leftTokenId = '';
  let rightCid = '';
  let rightTokenId = '';
  let inputs = '';
  if (!left.isZero() && !right.isZero()) {
    leftTokenId = left.toNumber();
    rightTokenId = right.toNumber();
    [leftCid, rightCid] = await Promise.all([
      getTroutCid(cidCache, nftrout, leftTokenId),
      getTroutCid(cidCache, nftrout, rightTokenId),
    ]);
  }

  const bacalhau = `bacalhau --api-host 127.0.0.1 --api-port 20000`;

  const envs = [
    `-e ATTOK_ADDR='${process.env.ATTOK_ADDR ?? ''}'`,
    `-e LOCKBOX_ADDR='${process.env.LOCKBOX_ADDR ?? ''}'`,
  ].join(' ');
  const bacalhauRun = `${bacalhau} docker run ${envs} --id-only --network=full ${inputs} ghcr.io/escrin/nftrout/nftrout -- /usr/bin/env node --enable-source-maps /opt/nftrout/nftrout '${config.gasKey}' '${config.nftStorageKey}' '${config.chainId}' '${tokenId}' '${leftTokenId}' '${leftCid}' '${rightTokenId}' '${rightCid}'`;
  const jobId = await runCmd(bacalhauRun);

  const bacalhauDescribe = `${bacalhau} describe --json ${jobId}`;
  const jobOutput = JSON.parse(await runCmd(bacalhauDescribe));
  const { State: jobState } = jobOutput;
  const {
    State: jobStateName,
    Executions: [{ RunOutput: runOutput }],
  } = jobState;
  const { exitCode, stdout: stdoutCid, stderr } = runOutput ?? {};
  if (jobStateName !== 'Completed' || stderr || exitCode !== 0) {
    const error = new Error('job did not complete successfully');
    (error as any).details = jobState;
    throw error;
  }
  const cid = stdoutCid.trim();
  cidCache.set(tokenId, cid);
  return cid;
}

function runCmd(cmd: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject({ error, stderr });
      else resolve(stdout.trim());
    }).on('error', reject);
  });
}

async function getTroutCid(
  cidCache: Map<number, string>,
  nftrout: NFTrout,
  tokenId: number,
): Promise<string> {
  const cacheValue = cidCache.get(tokenId);
  if (cacheValue) return cacheValue;

  const uri = await nftrout.callStatic.tokenURI(tokenId);
  if (uri === 'ipfs://') return '';
  const cid = uri.replace('ipfs://', '');
  const res = await fetch(`https://nftstorage.link/ipfs/${cid}/metadata.json`);
  const resBody = await res.text();
  try {
    const descriptor = JSON.parse(resBody);
    if (!descriptor.image.startsWith('ipfs://')) return '';
    cidCache.set(tokenId, cid);
    return cid;
  } catch {}
  return '';
}

task('uri')
  .addParam('id')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout')) as NFTrout;
    console.log(await nftrout.callStatic.tokenURI(args.id));
  });

task('make-breedable')
  .addParam('id')
  .addParam('fee')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout')) as NFTrout;
    const tx = await nftrout.list(args.id, ethers.utils.parseEther(args.fee));
    console.log(tx.hash);
    await tx.wait();
  });

task('transfer')
  .addParam('id')
  .addParam('to')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout')) as NFTrout;
    const tx = await nftrout.transferFrom(await nftrout.signer.getAddress(), args.to, args.id);
    console.log(tx.hash);
    await tx.wait();
  });

task('list-breedable').setAction(async (_, hre) => {
  const { ethers } = hre;
  const nftrout = (await ethers.getContract('NFTrout')) as NFTrout;
  const { number: blockTag } = await ethers.provider.getBlock('latest');
  const batchSize = 100;
  for (let offset = 0; ; offset += batchSize) {
    let studs: NFTrout.StudStructOutput[] = [];
    try {
      studs = await nftrout.callStatic.getStuds(offset, batchSize, {
        blockTag,
      });
    } catch (e: any) {
      console.error('failed to fetch studs', e);
      break;
    }
    await Promise.all(
      studs.map(async ({ tokenId, fee }) => {
        const tokenUri = await nftrout.callStatic.tokenURI(tokenId);
        console.log(tokenId.toNumber(), ethers.utils.formatEther(fee), tokenUri);
      }),
    );
    if (studs.length < batchSize) break;
  }
});

task('get-owners').setAction(async (_, hre) => {
  const { ethers } = hre;
  const nftrout = (await ethers.getContract('NFTrout')) as NFTrout;
  const totalSupply = (await nftrout.callStatic.totalSupply()).toNumber();
  const ownerPs = [];
  for (let i = 1; i <= totalSupply; i++) {
    ownerPs.push(nftrout.callStatic.ownerOf(i));
  }
  const owners = await Promise.all(ownerPs);
  for (const owner of owners) {
    console.log(owner);
  }
});

task('set-matchmaking-bps')
  .addParam('value')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout')) as NFTrout;
    const newMatchBps = ethers.BigNumber.from(args.matchmakingBps);
    const tx = await nftrout.setMatchmakingFee(newMatchBps);
    await tx.wait();
  });

task('set-mint-reward')
  .addParam('value')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout')) as NFTrout;
    const newMintReward = ethers.utils.parseEther(args.mintFee);
    const tx = await nftrout.setMintReward(newMintReward);
    await tx.wait();
  });

task('coverage', async (_args, hre, runSuper) => {
  hre.config.solidity.compilers.forEach((sc) => (sc.settings.viaIR = false));
  await runSuper();
});

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.18',
    settings: {
      optimizer: {
        enabled: true,
      },
      viaIR: true,
    },
  },
  networks: {
    local: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    'sapphire-testnet': {
      url: 'https://testnet.sapphire.oasis.dev',
      chainId: 0x5aff,
      accounts,
    },
    sapphire: {
      url: 'https://sapphire.oasis.io',
      chainId: 0x5afe,
      accounts,
    },
    hyperspace: {
      url: 'https://rpc.ankr.com/filecoin_testnet',
      chainId: 3141,
      accounts,
    },
    filecoin: {
      url: 'https://rpc.ankr.com/filecoin',
      chainId: 314,
      accounts,
    },
  },
  watcher: {
    compile: {
      tasks: ['compile'],
      files: ['./contracts/'],
    },
    test: {
      tasks: ['test'],
      files: ['./contracts/', './test'],
    },
    coverage: {
      tasks: ['coverage'],
      files: ['./contracts/', './test'],
    },
  },
  namedAccounts: {
    deployer: 0,
  },
};

export default config;
