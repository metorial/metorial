import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceId: z
      .string()
      .optional()
      .describe(
        'Optional default DotSimple Workspace UUID. Tools can select another workspace. Found in your browser URL bar: https://app.dotsimple.io/app/<workspace-id>'
      )
  })
);
