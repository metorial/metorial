import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .optional()
      .describe(
        'Your Beaconstac Organization ID. Required for organization-specific API requests, analytics, and multi-user access management.'
      )
  })
);
