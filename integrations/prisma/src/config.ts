import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default workspace ID to use for operations. If not set, the first available workspace will be used.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
