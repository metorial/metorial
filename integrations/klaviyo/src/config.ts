import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    revision: {
      schema: z
        .string()
        .default('2026-04-15')
        .describe(
          'Klaviyo API revision date (e.g., 2026-04-15). Controls API version behavior.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
