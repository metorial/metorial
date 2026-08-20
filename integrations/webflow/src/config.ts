import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    siteId: {
      schema: z
        .string()
        .optional()
        .describe('Default Webflow site ID to use for API requests'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
