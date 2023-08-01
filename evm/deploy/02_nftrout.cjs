const { NAME: INIT_TASK_ACCEPTOR } = require('./01_init_task_acceptor.cjs');

const NAME = 'NFTrout';

module.exports = async function (hre) {
  const { chainId } = await hre.ethers.provider.getNetwork();
  let mintReward = 0;
  if (chainId === 0x5afen) mintReward = 80;
  else if (chainId === 314n) mintReward = 1;

  if (chainId !== 31337n && (await hre.deployments.getOrNull(NAME))) return true;

  const { address: taskAcceptorAddr } = await hre.deployments.get(INIT_TASK_ACCEPTOR);
  const { deployer } = await hre.getNamedAccounts();
  await hre.deployments.deploy(NAME, {
    from: deployer,
    args: [taskAcceptorAddr, mintReward, 500, chainId !== 31337n],
    log: true,
    autoMine: true,
  });

  return true;
};

module.exports.id = NAME;
module.exports.tags = [NAME];
module.exports.dependencies = [INIT_TASK_ACCEPTOR];

module.exports.NAME = NAME;
