import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z.string().describe('Google Cloud Project ID'),
    region: z
      .string()
      .default('us-central1')
      .describe('Default region/location for Cloud Functions (e.g. us-central1, europe-west1)')
  })
);
