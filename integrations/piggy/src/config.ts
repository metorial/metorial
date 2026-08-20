import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    shopUuid: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default shop UUID to use for operations that require a shop. Can be overridden per-tool.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
