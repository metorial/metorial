import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z
        .string()
        .describe(
          'The Keen.io Project ID. Found on the project settings page at https://keen.io/project/PROJECT_ID.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
