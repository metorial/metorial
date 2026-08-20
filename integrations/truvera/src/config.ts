import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'test'])
        .default('production')
        .describe(
          'API environment. Production uses mainnet DIDs; Test uses testnet DIDs and cannot be used in production.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
