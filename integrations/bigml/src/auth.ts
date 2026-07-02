import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      username: z.string(),
      token: z.string(),
      organizationId: z.string().optional(),
      projectId: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      username: z.string().describe('Your BigML account username'),
      apiKey: z.string().describe('Your BigML API key, found in account settings'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID for organization-scoped access'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID for project-scoped access within an organization')
    }),

    getOutput: async ctx => {
      return {
        output: {
          username: ctx.input.username,
          token: ctx.input.apiKey,
          organizationId: ctx.input.organizationId,
          projectId: ctx.input.projectId
        }
      };
    }
  });
