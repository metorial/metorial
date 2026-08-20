import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z
        .string()
        .optional()
        .describe('Optional project ID for tracking API usage across multiple projects'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
