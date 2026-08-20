import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Roboflow workspace ID or URL slug. If not provided, defaults to the workspace associated with the API key.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
