import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    serverPrefix: z
      .string()
      .optional()
      .describe(
        'Mailchimp data center prefix (e.g., "us19"). Required for API key auth; auto-detected for OAuth.'
      )
  })
);
