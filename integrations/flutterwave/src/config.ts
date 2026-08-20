import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['sandbox', 'production'])
        .default('production')
        .describe(
          'Flutterwave environment to use. Sandbox for testing, production for live transactions.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
