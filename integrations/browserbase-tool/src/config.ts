import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .describe(
        'Browserbase Project ID from the dashboard. Required for creating sessions and managing resources.'
      )
  })
);
