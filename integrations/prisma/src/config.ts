import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceId: z
      .string()
      .optional()
      .describe(
        'Default workspace ID to use for operations. If not set, the first available workspace will be used.'
      )
  })
);
