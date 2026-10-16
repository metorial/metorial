import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { validateResourceId } from './lib/client';

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
      if (!ctx.input.username.trim() || !ctx.input.apiKey.trim()) {
        throw createApiServiceError('Provide your BigML username and API key.');
      }
      if (ctx.input.organizationId !== undefined)
        validateResourceId(ctx.input.organizationId, 'organization');
      if (ctx.input.projectId !== undefined)
        validateResourceId(ctx.input.projectId, 'project');
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
