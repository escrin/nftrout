import escrinWorker, * as escrin from '@escrin/worker';

import { Cipher } from './crypto.js';
import { Config, Spawner } from './spawner.js';

export default escrinWorker({
  async tasks(rnr: escrin.Runner): Promise<void> {
    const config = (await rnr.getConfig()) as Config;

    let cipher: Cipher;
    if (config.network.chainId === 31337 || config.network.chainId === 1337) {
      cipher = await Cipher.testing();
    } else {
      console.debug('acquiring identity');
      await rnr.acquireIdentity({
        network: config.network,
        identity: config.identity,
        permitTtl: 24 * 60 * 60, // 24 hours
        duration: 5 * 60, // 5 minutes
      });
      console.debug('obtaining omni key');
      cipher = new Cipher(await rnr.getOmniKey(config));
    }

    let spawner: Spawner;
    try {
      console.debug('getting spawner');
      spawner = await Spawner.get(config, cipher);
    } catch (e: any) {
      console.error('failed to get spawner', e);
      throw e;
    }
    try {
      console.debug('spawning');
      await spawner.spawn();
      console.debug('done spawning');
    } catch (e: any) {
      console.error('failed to spawn', e);
      throw e;
    }
  },
});
