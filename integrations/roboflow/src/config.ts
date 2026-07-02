import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceId: z
      .string()
      .optional()
      .describe(
        'Roboflow workspace ID or URL slug. If not provided, defaults to the workspace associated with the API key.'
      )
  })
);
