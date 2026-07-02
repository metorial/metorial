import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .describe(
        'The URL of your Sourcegraph instance (e.g., https://sourcegraph.example.com). Required for all API calls.'
      )
  })
);
