import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceId: {
      schema: z
        .string()
        .describe(
          'Your DotSimple Workspace UUID. Found in your browser URL bar: https://app.dotsimple.io/app/<workspace-id>'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
