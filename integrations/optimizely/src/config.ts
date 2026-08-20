import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    product: {
      schema: z
        .enum(['experimentation', 'cmp', 'cms', 'campaign', 'odp'])
        .describe('The Optimizely product to connect to'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    campaignClientId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Client ID for Campaign REST API (found under Administration > API Overview). Only needed for Campaign product.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
