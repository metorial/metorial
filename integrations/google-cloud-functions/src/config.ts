import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z.string().describe('Google Cloud Project ID'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    region: {
      schema: z
        .string()
        .default('us-central1')
        .describe(
          'Default region/location for Cloud Functions (e.g. us-central1, europe-west1)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
