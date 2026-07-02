import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceId: z
      .string()
      .optional()
      .describe(
        'Default workspace (project) ID to use for API operations. If not set, must be provided per-tool.'
      ),
    environmentId: z
      .string()
      .optional()
      .describe(
        'Default environment ID or name to use for flag definitions and segment operations.'
      )
  })
);
