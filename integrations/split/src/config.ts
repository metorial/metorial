import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceId: z
      .string()
      .optional()
      .describe(
        'Optional default workspace (project) ID. Call list_workspaces to discover available IDs; it can also be supplied per tool.'
      ),
    environmentId: z
      .string()
      .optional()
      .describe(
        'Optional default environment ID or name for flag definitions and segment operations. Call list_environments to discover environments.'
      )
  })
);
