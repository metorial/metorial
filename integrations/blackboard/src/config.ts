import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .describe(
          'The base URL of your Blackboard Learn instance (e.g., https://yourschool.blackboard.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
