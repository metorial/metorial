import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .optional()
      .describe(
        'Your Backendless application subdomain (e.g. "xxxx" from xxxx.backendless.app). If provided, the subdomain-based URL format will be used instead of the native endpoint.'
      ),
    region: z
      .enum(['us', 'eu', 'sa'])
      .default('us')
      .describe(
        'Hosting region for your Backendless application. Determines the API endpoint base URL.'
      )
  })
);
