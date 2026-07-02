import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    network: z
      .string()
      .default('eth-mainnet')
      .describe(
        'The blockchain network to use (e.g., eth-mainnet, eth-sepolia, polygon-mainnet, arb-mainnet, opt-mainnet, base-mainnet, solana-mainnet)'
      )
  })
);
