import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    teamName: z
      .string()
      .optional()
      .describe(
        'Team name to use when creating resources with a global API token. Required when using a global token.'
      )
  })
);
