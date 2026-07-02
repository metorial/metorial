import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe(
        'Your Breeze account subdomain (e.g., "yourchurch" from yourchurch.breezechms.com)'
      ),
    teamId: z
      .string()
      .optional()
      .describe(
        'Team ID for multi-team accounts. Required if the user belongs to multiple teams/organizations.'
      )
  })
);
