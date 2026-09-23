import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .optional()
      .describe(
        'Google Cloud Project ID for BigQuery operations. Not needed for get_current_user.'
      ),
    location: z
      .string()
      .default('US')
      .describe(
        'Default data location/region for BigQuery operations (e.g., US, EU, us-central1)'
      )
  })
);
