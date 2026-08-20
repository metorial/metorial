import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .describe(
          'The base URL of your ToolJet instance (e.g., https://your-tooljet-instance.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
