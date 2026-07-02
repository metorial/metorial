import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { auth0ServiceError, requireField } from '../lib/errors';
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
      let actionId = requireField(ctx.input.actionId, 'actionId', 'get');
      let a = await client.getAction(actionId);
      return {
        output: { actionDetails: mapAction(a) },
        message: `Retrieved action **${a.name}** (${a.status}).`
      };
    }

    if (ctx.input.action === 'create') {
      let name = requireField(ctx.input.name, 'name', 'create');
      let triggerId = requireField(ctx.input.triggerId, 'triggerId', 'create');
      let code = requireField(ctx.input.code, 'code', 'create');
      let a = await client.createAction({
        name,
        supportedTriggers: [{ id: triggerId, version: ctx.input.triggerVersion || 'v3' }],
        code,
        dependencies: ctx.input.dependencies,
        secrets: ctx.input.secrets
      });
      return {
        output: { actionDetails: mapAction(a) },
        message: `Created action **${a.name}**. Remember to deploy it to make it active.`
      };
    }

    if (ctx.input.action === 'update') {
      let actionId = requireField(ctx.input.actionId, 'actionId', 'update');
      let a = await client.updateAction(actionId, {
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
      let actionId = requireField(ctx.input.actionId, 'actionId', 'deploy');
      let _a = await client.deployAction(actionId);
      return {
        output: { deployed: true },
        message: `Deployed action successfully.`
      };
    }

    if (ctx.input.action === 'delete') {
      let actionId = requireField(ctx.input.actionId, 'actionId', 'delete');
      await client.deleteAction(actionId);
      return {
        output: { deleted: true },
        message: `Deleted action **${actionId}**.`
      };
    }

    throw auth0ServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
