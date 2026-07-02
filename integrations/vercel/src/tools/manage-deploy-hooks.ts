import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { vercelServiceError } from '../lib/errors';
import { spec } from '../spec';

let normalizeDeployHook = (hook: any) => ({
  hookId: hook.id,
  name: hook.name,
  ref: hook.ref,
  hookUrl: hook.url,
  createdAt: hook.createdAt
});

export let manageDeployHooksTool = SlateTool.create(spec, {
  name: 'Manage Deploy Hooks',
  key: 'manage_deploy_hooks',
  description:
    'List, create, or delete Vercel Deploy Hooks for a Git-connected project. Deploy Hooks provide secret URLs that trigger deployments for a specific branch.',
  instructions: [
    'Use action "list" to list deploy hooks configured on a project.',
    'Use action "create" to create a deploy hook for a project branch.',
    'Use action "delete" to revoke a deploy hook by ID.',
    'Treat returned hookUrl values as secrets because anyone with the URL can trigger deployments.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      projectIdOrName: z.string().describe('Project ID or name'),
      hookId: z.string().optional().describe('Deploy Hook ID (required for delete)'),
      name: z.string().optional().describe('Deploy Hook name (required for create)'),
      ref: z
        .string()
        .optional()
        .describe('Git branch or ref the Deploy Hook should deploy (required for create)')
    })
  )
  .output(
    z.object({
      hooks: z
        .array(
          z.object({
            hookId: z.string().optional().describe('Deploy Hook ID'),
            name: z.string().optional().describe('Deploy Hook name'),
            ref: z.string().optional().describe('Git ref deployed by the hook'),
            hookUrl: z.string().optional().describe('Secret URL used to trigger the hook'),
            createdAt: z.number().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of deploy hooks'),
      hook: z
        .object({
          hookId: z.string().optional().describe('Deploy Hook ID'),
          name: z.string().optional().describe('Deploy Hook name'),
          ref: z.string().optional().describe('Git ref deployed by the hook'),
          hookUrl: z.string().optional().describe('Secret URL used to trigger the hook'),
          createdAt: z.number().optional().describe('Creation timestamp')
        })
        .optional()
        .describe('Deploy Hook details'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { action, projectIdOrName } = ctx.input;

    if (action === 'list') {
      let result = await client.listDeployHooks(projectIdOrName);
      let hooks = (Array.isArray(result) ? result : []).map(normalizeDeployHook);
      return {
        output: { hooks, success: true },
        message: `Found **${hooks.length}** deploy hook(s) for project "${projectIdOrName}".`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.ref) {
        throw vercelServiceError('name and ref are required for create');
      }
      let result = await client.createDeployHook(projectIdOrName, {
        name: ctx.input.name,
        ref: ctx.input.ref
      });
      let hook = result.deployHook || result;
      return {
        output: { hook: normalizeDeployHook(hook), success: true },
        message: `Created deploy hook **${ctx.input.name}** for ref **${ctx.input.ref}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.hookId) {
        throw vercelServiceError('hookId is required for delete');
      }
      await client.deleteDeployHook(projectIdOrName, ctx.input.hookId);
      return {
        output: { success: true },
        message: `Deleted deploy hook **${ctx.input.hookId}**.`
      };
    }

    throw vercelServiceError(`Unknown action: ${action}`);
  })
  .build();
