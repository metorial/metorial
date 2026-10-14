import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'testnet'])
      .default('production')
      .describe(
        'API environment. Production uses api.truvera.io, testnet uses api-testnet.truvera.io'
      )
  })
);
