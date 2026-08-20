import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    instanceUrl: {
      schema: z
        .string()
        .describe(
          'The URL of your Metabase instance (e.g., https://your-metabase.example.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
