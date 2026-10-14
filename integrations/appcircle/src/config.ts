import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiBaseUrl: z
      .string()
      .default('https://api.appcircle.io')
      .describe('Base URL for the Appcircle API. Change this for self-hosted deployments.')
  })
);
