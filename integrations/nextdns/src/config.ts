import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    profileId: z
      .string()
      .optional()
      .describe('Default NextDNS profile ID to use for triggers and as a fallback for tools')
  })
);
