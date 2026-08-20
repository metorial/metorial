import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiBaseUrl: {
      schema: z
        .string()
        .default('https://api.appcircle.io')
        .describe('Base URL for the Appcircle API. Change this for self-hosted deployments.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    authBaseUrl: {
      schema: z
        .string()
        .default('https://auth.appcircle.io')
        .describe(
          'Base URL for the Appcircle Auth API. Change this for self-hosted deployments.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
