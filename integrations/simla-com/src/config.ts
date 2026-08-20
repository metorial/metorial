import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe('Your Simla.com account subdomain (e.g., "myshop" for myshop.simla.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    site: {
      schema: z
        .string()
        .optional()
        .describe(
          'Symbolic code of the store, required when the API key has access to multiple stores'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
