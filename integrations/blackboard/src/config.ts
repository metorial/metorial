import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .describe(
        'The base URL of your Blackboard Learn instance (e.g., https://yourschool.blackboard.com)'
      )
  })
);
