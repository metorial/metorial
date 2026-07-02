import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceId: z
      .string()
      .describe('The ClickUp Workspace (Team) ID. Found in workspace settings or via the API.')
  })
);
