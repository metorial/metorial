import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['test', 'live'])
        .default('test')
        .describe(
          'Whether to use test or live mode. Determines which API keys and data are used.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
