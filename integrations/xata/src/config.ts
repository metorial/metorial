import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceId: z
      .string()
      .optional()
      .describe(
        'Xata workspace ID (e.g., "ws-abc123"). Required for workspace-scoped API operations.'
      ),
    region: z
      .string()
      .default('us-east-1')
      .describe('Region for the Xata workspace (e.g., "us-east-1", "eu-west-1").'),
    databaseName: z
      .string()
      .optional()
      .describe('Default database name to use for operations. Can be overridden per-tool.'),
    branch: z
      .string()
      .default('main')
      .describe('Default branch name to use for operations. Can be overridden per-tool.')
  })
);
