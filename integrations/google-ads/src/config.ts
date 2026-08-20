import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    loginCustomerId: {
      schema: z
        .string()
        .optional()
        .describe(
          'The Google Ads manager account ID (without hyphens) used when making API calls on behalf of a client account. Required when using a manager account.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
