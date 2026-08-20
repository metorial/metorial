import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default Asana workspace GID. If provided, tools will use this workspace when no workspace is specified.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    webhookProjectId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Project GID used when auto-registering the Task Changes (Webhook) trigger. Asana delivers task events to webhooks on a project (or task), not on the workspace alone.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
