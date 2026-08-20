import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z.string().describe('Google Cloud Project ID used for all BigQuery API calls'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    location: {
      schema: z
        .string()
        .default('US')
        .describe(
          'Default data location/region for BigQuery operations (e.g., US, EU, us-central1)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
