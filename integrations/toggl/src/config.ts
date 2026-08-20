import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceId: {
      schema: z
        .string()
        .describe(
          'Default Toggl workspace ID. Most API operations require a workspace context.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
