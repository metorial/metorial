import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    instanceUrl: {
      schema: z
        .string()
        .describe(
          'The URL of your Sourcegraph instance (e.g., https://sourcegraph.example.com). Required for all API calls.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
