import { deployments } from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

import { NAME as LILYPAD_EVENTS } from './01_lilypad_events';

export const NAME = 'NFTrout';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  await hre.deployments.deploy(NAME, {
    from: deployer,
    args: [(await deployments.get(LILYPAD_EVENTS)).address],
    log: true,
    autoMine: true,
  });
};

func.tags = [NAME];
func.dependencies = [LILYPAD_EVENTS];

export default func;

