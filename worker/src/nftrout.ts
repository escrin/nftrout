import escrinWorker, { ApiError, EscrinRunner } from '@escrin/runner';

import { Config as SpawnerConfig, Spawner } from './spawner.js';

escrinWorker({
  async tasks(rnr: EscrinRunner): Promise<void> {
    const config = await rnr.getConfig();
    if (config.network !== 'sapphire-testnet' && config.network !== 'sapphire-mainnet') {
      throw new ApiError(500, `invalid network: ${config.network}`);
    }
    if (typeof config.nftStorageKey !== 'string') {
      throw new ApiError(500, `missing NFT Storage key`);
    }
    if (typeof config.signerKey !== 'string') {
      throw new ApiError(500, `missing signer key`);
    }
    const spawner = await Spawner.get(rnr, config as SpawnerConfig);
    await spawner.spawn();
  },
});
