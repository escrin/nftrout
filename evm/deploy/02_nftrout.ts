import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

import { NAME as INIT_TASK_ACCEPTOR } from './01_init_task_acceptor';

export const NAME = 'NFTrout';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { chainId } = await hre.ethers.provider.getNetwork();
  let mintReward = 0;
  if (chainId === 0x5afe) mintReward = 80;
  else if (chainId === 314) mintReward = 1;

  const { address: taskAcceptorAddr } = await hre.deployments.get(INIT_TASK_ACCEPTOR);
  const { deployer } = await hre.getNamedAccounts();
  await hre.deployments.deploy(NAME, {
    from: deployer,
    args: [taskAcceptorAddr, mintReward, 500, true],
    log: true,
    autoMine: true,
  });
};

func.tags = [NAME];
func.dependencies = [INIT_TASK_ACCEPTOR];

export default func;
