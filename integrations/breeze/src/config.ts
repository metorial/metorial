import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe(
          'Your Breeze account subdomain (e.g., "yourchurch" from yourchurch.breezechms.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    teamId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Team ID for multi-team accounts. Required if the user belongs to multiple teams/organizations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
