import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    agent: {
      schema: z
        .string()
        .optional()
        .describe(
          'Agent (client) ID for agency accounts. When using Global API credentials, specify which client to target.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
