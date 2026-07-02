import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceName: z
      .string()
      .describe(
        'The workspace slug (account name) as it appears in your Mode URL: app.mode.com/home/{workspace_name}'
      )
  })
);
