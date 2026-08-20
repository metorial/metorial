import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    database: {
      schema: z
        .string()
        .default('us')
        .describe(
          'Regional database code (e.g., us, uk, de, fr, es, it, br, ca, au, ru). Defaults to "us".'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
