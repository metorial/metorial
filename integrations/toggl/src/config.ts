import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceId: z
      .string()
      .describe('Default Toggl workspace ID. Most API operations require a workspace context.')
  })
);
