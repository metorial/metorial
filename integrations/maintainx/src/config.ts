import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .optional()
        .describe(
          'MaintainX Organization ID. Required when using a Multi-Organization Token.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
