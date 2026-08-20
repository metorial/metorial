import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    siteId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Planyo Site ID. Required for metasite API keys to scope operations to a specific site.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
