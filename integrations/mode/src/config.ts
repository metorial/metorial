import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceName: {
      schema: z
        .string()
        .describe(
          'The workspace slug (account name) as it appears in your Mode URL: app.mode.com/home/{workspace_name}'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
