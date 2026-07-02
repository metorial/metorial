import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let manageActionsTool = SlateTool.create(spec, {
  name: 'Manage Actions',
  key: 'manage_actions',
  description: `Create, update, deploy, delete, or list Auth0 Actions. Actions are serverless functions that execute during authentication flows (login, registration, password change, etc.) to add custom logic.`,
  instructions: [
    'After creating or updating an action, use the "deploy" action to make it live.',
    'The trigger ID determines when the action runs (e.g., "post-login", "pre-user-registration").'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'deploy', 'delete'])
        .describe('Action to perform'),
      actionId: z
        .string()
        .optional()
        .describe('Action ID (required for get, update, deploy, delete)'),
      name: z.string().optional().describe('Action name (required for create)'),
      triggerId: z
        .string()
        .optional()
        .describe(
          'Trigger ID, e.g., "post-login", "pre-user-registration" (required for create)'
        ),
      triggerVersion: z.string().optional().describe('Trigger version (default "v3")'),
      code: z.string().optional().describe('JavaScript code for the action'),
      dependencies: z
        .array(
          z.object({
            name: z.string().describe('NPM package name'),
            version: z.string().describe('Package version')
          })
        )
        .optional()
        .describe('NPM dependencies for the action'),
      secrets: z
        .array(
          z.object({
            name: z.string().describe('Secret name'),
            value: z.string().describe('Secret value')
          })
        )
        .optional()
        .describe('Environment secrets available to the action')
    })
  )
  .output(
    z.object({
      actionDetails: z
        .object({
          actionId: z.string(),
          name: z.string(),
          status: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
        .optional()
        .describe('Action details'),
      actions: z
        .array(
          z.object({
            actionId: z.string(),
            name: z.string(),
            status: z.string().optional()
          })
        )
        .optional()
        .describe('List of actions'),
      deployed: z.boolean().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let mapAction = (a: any) => ({
      actionId: a.id,
      name: a.name,
      status: a.status,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    });

    if (ctx.input.action === 'list') {
      let result = await client.listActions({
        triggerId: ctx.input.triggerId
      });
      let actions = (result.actions ?? []).map((a: any) => ({
        actionId: a.id,
        name: a.name,
        status: a.status
      }));
      return {
        output: { actions },
        message: `Found **${actions.length}** action(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.actionId) throw new Error('actionId is required for get action');
      let a = await client.getAction(ctx.input.actionId);
      return {
        output: { actionDetails: mapAction(a) },
        message: `Retrieved action **${a.name}** (${a.status}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      if (!ctx.input.triggerId) throw new Error('triggerId is required for create action');
      if (!ctx.input.code) throw new Error('code is required for create action');
      let a = await client.createAction({
        name: ctx.input.name,
        supportedTriggers: [
          { id: ctx.input.triggerId, version: ctx.input.triggerVersion || 'v3' }
        ],
        code: ctx.input.code,
        dependencies: ctx.input.dependencies,
        secrets: ctx.input.secrets
      });
      return {
        output: { actionDetails: mapAction(a) },
        message: `Created action **${a.name}**. Remember to deploy it to make it active.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.actionId) throw new Error('actionId is required for update action');
      let a = await client.updateAction(ctx.input.actionId, {
        name: ctx.input.name,
        code: ctx.input.code,
        dependencies: ctx.input.dependencies,
        secrets: ctx.input.secrets
      });
      return {
        output: { actionDetails: mapAction(a) },
        message: `Updated action **${a.name}**. Remember to deploy it to apply changes.`
      };
    }

    if (ctx.input.action === 'deploy') {
      if (!ctx.input.actionId) throw new Error('actionId is required for deploy action');
      let _a = await client.deployAction(ctx.input.actionId);
      return {
        output: { deployed: true },
        message: `Deployed action successfully.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.actionId) throw new Error('actionId is required for delete action');
      await client.deleteAction(ctx.input.actionId);
      return {
        output: { deleted: true },
        message: `Deleted action **${ctx.input.actionId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
