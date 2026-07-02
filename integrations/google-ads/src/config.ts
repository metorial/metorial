import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    loginCustomerId: z
      .string()
      .optional()
      .describe(
        'The Google Ads manager account ID (without hyphens) used when making API calls on behalf of a client account. Required when using a manager account.'
      )
  })
);
