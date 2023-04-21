import { exec } from 'child_process';

import { ethers } from 'ethers';
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
  const nftrout = await ethers.getContract('NFTrout');
  const tx = await nftrout.mint({ value: await nftrout.callStatic.getBreedingFee(0, 0) });
  console.log(tx.hash);
  const receipt = await tx.wait();
  for (const event of receipt.events) {
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
    const nftrout = await ethers.getContract('NFTrout');
    const breedingFee = await nftrout.callStatic.getBreedingFee(args.left, args.right);
    const tx = await nftrout.breed(args.left, args.right, {
      value: breedingFee,
    });
    console.log(tx.hash);
    const receipt = await tx.wait();
    for (const event of receipt.events) {
      if (event.event !== 'Transfer') continue;
      console.log(ethers.BigNumber.from(receipt.events![0].topics[3]).toNumber());
      break;
    }
  });

type Config = {
  gasKey: string;
  chainId: number;
};

task('invoke-spawner').setAction(async (_, hre) => {
  const { ethers } = hre;

  const gasKey = process.env.GAS_KEY;
  if (!gasKey) throw new Error('missing GAS_KEY');
  const chainId = hre.network.config.chainId!;

  const config = { gasKey, chainId };

  const nftrout = (await ethers.getContract('NFTrout')) as NFTrout;

  const totalSupply = (await nftrout.callStatic.totalSupply()).toNumber();

  const needsSpawning = [];
  for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
    needsSpawning.push(
      (async () => {
        let numRetries = 3;
        for (let i = 0; i < numRetries; i++) {
          try {
            const existingCid = await getTroutCid(nftrout, tokenId);
            if (existingCid) return undefined;
            return tokenId;
          } catch (e: any) {
            if (i === numRetries - 1) throw e;
          }
        }
        throw new Error('unable to fetch trout cid');
      })(),
    );
  }

  const taskIds: number[] = [];
  const cids: string[] = [];

  for (const tokenId of await Promise.all(needsSpawning)) {
    if (tokenId === undefined) continue;
    const cid = await spawnTrout(nftrout, tokenId, config); // TODO: cache these
    taskIds.push(tokenId);
    cids.push(cid);
  }

  const encodedCids = ethers.utils.defaultAbiCoder.encode(['string[]'], [cids]);
  const tx = await nftrout.acceptTaskResults(taskIds, [], encodedCids);
  const receipt = await tx.wait();
  if (receipt.status !== 1) throw new Error('failed to accept tasks');
});

/// Returns the trout CID.
async function spawnTrout(nftrout: NFTrout, tokenId: number, config: Config): Promise<string> {
  const { left, right } = await nftrout.callStatic.parents(tokenId);

  let inputs = '';
  if (!left.isZero() && !right.isZero()) {
    const [leftCid, rightCid] = await Promise.all([
      getTroutCid(nftrout, left.toNumber()),
      getTroutCid(nftrout, right.toNumber()),
    ]);
    console.log(leftCid, rightCid);
    inputs += `--inputs src=ipfs://${leftCid},dst=/inputs/left.json`;
    inputs += `--inputs src=ipfs://${rightCid},dst=/inputs/right.json`;
  }

  const bacalhau = `bacalhau --api-host 127.0.0.1 --api-port 20000`;

  const bacalhauRun = `${bacalhau} docker run --id-only --network=full ${inputs} --tee --publisher ipfs ghcr.io/escrin/nftrout/nftrout -- /usr/bin/env node /opt/nftrout/nftrout ${config.gasKey} ${config.chainId} ${tokenId}`;
  console.log(bacalhauRun);
  const jobId = await runCmd(bacalhauRun);

  const bacalhauDescribe = `${bacalhau} describe --json ${jobId}`;
  const {
    State: {
      State: jobState,
      Executions: [
        {
          PublishedResults: { CID: cid },
          RunOutput: { exitCode, stderr },
        },
      ],
    },
  } = JSON.parse(await runCmd(bacalhauDescribe));
  if (jobState !== 'Completed' || !cid || stderr || exitCode !== 0) {
    console.error('job did not complete successfully', {
      jobState,
      cid,
      stderr,
      exitCode,
    });
    return '';
  }
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

async function getTroutCid(nftrout: NFTrout, tokenId: number): Promise<string> {
  const uri = await nftrout.callStatic.tokenURI(tokenId);
  if (uri === 'ipfs://') return '';
  const cid = uri.replace('ipfs://', '');
  const res = await fetch(`https://ipfs.escrin.org/ipfs/${cid}/outputs/trout.json`);
  const resBody = await res.text();
  try {
    const descriptor = JSON.parse(resBody);
    if (descriptor.seed) return cid;
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
