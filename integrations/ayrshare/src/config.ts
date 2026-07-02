import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    profileKey: z
      .string()
      .optional()
      .describe(
        'Profile Key for operating on behalf of a specific user profile (Business Plan)'
      )
  })
);
