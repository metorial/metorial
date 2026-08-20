import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'testnet'])
        .default('production')
        .describe(
          'API environment. Production uses api.dock.io, testnet uses api-testnet.dock.io'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
