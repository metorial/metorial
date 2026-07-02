import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    chain: z
      .enum(['mainnet', 'hoodi'])
      .default('mainnet')
      .describe(
        'Ethereum network to query. "mainnet" for Ethereum mainnet, "hoodi" for Hoodi testnet.'
      )
  })
);
