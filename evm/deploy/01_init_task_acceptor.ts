import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

export const NAME = 'TrustMeBroTaskAcceptor';

const envs: Record<string, string> = new Proxy(
  {},
  {
    get(_, prop: string) {
      const v = process.env[prop];
      if (!v) throw new Error(`missing env var: ${prop}`);
      return v;
    },
  },
);

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();

  const { chainId } = await hre.ethers.provider.getNetwork();
  let trustedSender: string;
  if (chainId === 1337 || chainId == 31337) trustedSender = deployer;
  else trustedSender = envs.TRUSTED_SENDER;

  await hre.deployments.deploy(NAME, {
    from: deployer,
    args: [trustedSender],
    log: true,
    autoMine: true,
  });
};

func.tags = [NAME];

export default func;
