import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['test', 'live'])
        .default('live')
        .describe(
          'Radar environment to use. Test keys work with the test environment, live keys with the live environment.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
