import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z.string().describe('Google Cloud Project ID used for all BigQuery API calls'),
    location: z
      .string()
      .default('US')
      .describe(
        'Default data location/region for BigQuery operations (e.g., US, EU, us-central1)'
      )
  })
);
