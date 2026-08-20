import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .optional()
        .describe(
          'Your Backendless application subdomain (e.g. "xxxx" from xxxx.backendless.app). If provided, the subdomain-based URL format will be used instead of the native endpoint.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    region: {
      schema: z
        .enum(['us', 'eu', 'sa'])
        .default('us')
        .describe(
          'Hosting region for your Backendless application. Determines the API endpoint base URL.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
