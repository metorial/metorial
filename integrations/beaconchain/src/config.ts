import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    chain: {
      schema: z
        .enum(['mainnet', 'hoodi'])
        .default('mainnet')
        .describe(
          'Ethereum network to query. "mainnet" for Ethereum mainnet, "hoodi" for Hoodi testnet.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
