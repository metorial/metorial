import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    datasetId: {
      schema: z
        .string()
        .describe(
          'The Dataset ID (site) that identifies which dataset to query or send data to. Found in your LeadBoxer account under Integrations > Data.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
