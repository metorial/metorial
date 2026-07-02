import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    product: z
      .enum(['experimentation', 'cmp', 'cms', 'campaign', 'odp'])
      .describe('The Optimizely product to connect to'),
    campaignClientId: z
      .string()
      .optional()
      .describe(
        'Client ID for Campaign REST API (found under Administration > API Overview). Only needed for Campaign product.'
      )
  })
);
