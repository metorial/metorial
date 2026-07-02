import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe('Your Simla.com account subdomain (e.g., "myshop" for myshop.simla.com)'),
    site: z
      .string()
      .optional()
      .describe(
        'Symbolic code of the store, required when the API key has access to multiple stores'
      )
  })
);
