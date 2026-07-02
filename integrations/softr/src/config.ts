import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .optional()
      .describe(
        'Your Softr application domain (e.g., yourapp.softr.app). Required for user management operations via the Studio API.'
      )
  })
);
