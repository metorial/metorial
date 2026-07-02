import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environmentId: z
      .string()
      .describe(
        'The Environment ID (formerly Project ID) from Kontent.ai project settings. Identifies the specific environment within a project.'
      )
  })
);
