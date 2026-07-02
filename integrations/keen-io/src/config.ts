import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .describe(
        'The Keen.io Project ID. Found on the project settings page at https://keen.io/project/PROJECT_ID.'
      )
  })
);
