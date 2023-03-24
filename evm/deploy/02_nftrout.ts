import { ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

import { NAME as LILYPAD_EVENTS } from './01_lilypad_events';

export const NAME = 'NFTrout';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { address: lilypadEventsAddr } = await hre.deployments.get(LILYPAD_EVENTS);
  const result = await hre.deployments.deploy(NAME, {
    from: deployer,
    args: [lilypadEventsAddr],
    log: true,
    autoMine: true,
  });
  await authorizeContract(lilypadEventsAddr, result.address);
};

async function authorizeContract(lilypadEventsAddr: string, nftroutAddr: string): Promise<void> {
  const LilypadEvents = await ethers.getContractFactory(LILYPAD_EVENTS);
  const lilypadEvents = LilypadEvents.attach(lilypadEventsAddr);
  if ((await lilypadEvents.callStatic.authorizedContract()) === lilypadEventsAddr) return;
  const tx = await lilypadEvents.setAuthorizedContract(nftroutAddr);
  await tx.wait();
}

func.tags = [NAME];
func.dependencies = [LILYPAD_EVENTS];

export default func;

