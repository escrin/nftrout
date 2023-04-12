import { HardhatUserConfig, task } from 'hardhat/config';
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
  const signers = await hre.ethers.getSigners();
  const balances = await Promise.all(signers.map((s) => hre.ethers.provider.getBalance(s.address)));
  for (let i = 0; i < signers.length; i++) {
    let num: string | number;
    try {
      num = balances[i].toNumber();
    } catch {
      num = balances[i].toString();
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

task('uri')
  .addParam('id')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout')) as NFTrout;
    console.log(await nftrout.callStatic.tokenURI(args.id));
  });

task('list')
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
    }
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
