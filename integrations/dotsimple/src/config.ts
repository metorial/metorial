import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceId: z
      .string()
      .describe(
        'Your DotSimple Workspace UUID. Found in your browser URL bar: https://app.dotsimple.io/app/<workspace-id>'
      )
  })
);
