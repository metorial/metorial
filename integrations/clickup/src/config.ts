import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceId: {
      schema: z
        .string()
        .describe(
          'The ClickUp Workspace (Team) ID. Found in workspace settings or via the API.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
