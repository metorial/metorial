import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z
        .string()
        .describe(
          'Browserbase Project ID from the dashboard. Required for creating sessions and managing resources.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
