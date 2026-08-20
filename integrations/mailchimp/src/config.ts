import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    serverPrefix: {
      schema: z
        .string()
        .optional()
        .describe(
          'Mailchimp data center prefix (e.g., "us19"). Required for API key auth; auto-detected for OAuth.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
