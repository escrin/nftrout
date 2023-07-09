const NAME = 'TrustMeBroTaskAcceptor';

const envs = new Proxy(
  {},
  {
    get(_, prop) {
      const v = process.env[prop];
      if (!v) throw new Error(`missing env var: ${prop}`);
      return v;
    },
  },
);

module.exports = async function (hre) {
  const { deployer } = await hre.getNamedAccounts();

  const { chainId } = await hre.ethers.provider.getNetwork();
  let trustedSender;
  if (chainId === 1337n || chainId == 31337n) trustedSender = deployer;
  else trustedSender = envs.TRUSTED_SENDER;

  await hre.deployments.deploy(NAME, {
    from: deployer,
    args: [trustedSender],
    log: true,
    autoMine: true,
  });
};

module.exports.tags = [NAME];

module.exports.NAME = NAME;
