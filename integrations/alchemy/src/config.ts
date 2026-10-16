import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    network: z
      .string()
      .default('eth-mainnet')
      .describe(
        'Alchemy network identifier, such as eth-mainnet, eth-sepolia, polygon-mainnet, arb-mainnet, opt-mainnet, or base-mainnet. These tools use EVM APIs; availability depends on the selected network.'
      )
  })
);
