import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

export const NAME = 'LilypadEvents';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  await hre.deployments.deploy(NAME, {
    from: deployer,
    log: true,
    autoMine: true,
  });
};

func.tags = [NAME];

export default func;
