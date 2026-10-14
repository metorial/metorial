import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environmentId: z
      .string()
      .optional()
      .describe(
        'Legacy default Environment ID from Kontent.ai project settings. Prefer the environmentId tool input; existing connections may keep this default.'
      )
  })
);
