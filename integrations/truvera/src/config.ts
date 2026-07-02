import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'test'])
      .default('production')
      .describe(
        'API environment. Production uses mainnet DIDs; Test uses testnet DIDs and cannot be used in production.'
      )
  })
);
