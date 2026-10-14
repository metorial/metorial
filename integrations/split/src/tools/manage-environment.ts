import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageEnvironment = SlateTool.create(spec, {
  name: 'Manage Environment',
  key: 'manage_environment',
  description: `Create or delete an environment in a Split workspace. Use action "create" to add a new deployment environment, or "delete" to remove one.`,
  instructions: ['Deleting an environment removes all flag definitions in that environment.']
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID. Call list_workspaces to discover IDs. Falls back to the configured default.'
        ),
      action: z.enum(['create', 'delete']).describe('Action to perform.'),
      environmentName: z.string().describe('Name of the environment to create or delete.'),
      production: z
        .boolean()
        .optional()
        .describe('Mark as production environment (for create only). Defaults to false.')
    })
  )
  .output(
    z.object({
      environmentId: z.string().optional(),
      environmentName: z.string(),
      action: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    if (!wsId) {
      throw createApiServiceError(
        'workspaceId is required. Call list_workspaces to discover IDs, then pass the ID or set the default workspace.'
      );
    }

    let client = new Client(ctx.auth);

    if (ctx.input.action === 'create') {
      let env = await client.createEnvironment(wsId, {
        name: ctx.input.environmentName,
        production: ctx.input.production ?? false
      });

      return {
        output: {
          environmentId: env.id,
          environmentName: env.name,
          action: 'create',
          success: true
        },
        message: `Created environment **${env.name}** (production: ${env.production}).`
      };
    } else {
      await client.deleteEnvironment(wsId, ctx.input.environmentName);

      return {
        output: {
          environmentName: ctx.input.environmentName,
          action: 'delete',
          success: true
        },
        message: `Deleted environment **${ctx.input.environmentName}**.`
      };
    }
  })
  .build();
