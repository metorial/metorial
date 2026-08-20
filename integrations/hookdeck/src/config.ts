import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiVersion: {
      schema: z
        .string()
        .default('2025-07-01')
        .describe('Hookdeck API version (date string, e.g. 2025-07-01)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
