import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    network: {
      schema: z
        .string()
        .default('eth-mainnet')
        .describe(
          'The blockchain network to use (e.g., eth-mainnet, eth-sepolia, polygon-mainnet, arb-mainnet, opt-mainnet, base-mainnet, solana-mainnet)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
