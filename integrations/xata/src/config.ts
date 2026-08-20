import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Xata workspace ID (e.g., "ws-abc123"). Required for workspace-scoped API operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    region: {
      schema: z
        .string()
        .default('us-east-1')
        .describe('Region for the Xata workspace (e.g., "us-east-1", "eu-west-1").'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    databaseName: {
      schema: z
        .string()
        .optional()
        .describe('Default database name to use for operations. Can be overridden per-tool.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    branch: {
      schema: z
        .string()
        .default('main')
        .describe('Default branch name to use for operations. Can be overridden per-tool.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
