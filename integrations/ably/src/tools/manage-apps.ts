import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AblyControlClient } from '../lib/control-client';
import { accountIdInput, appIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let manageApps = SlateTool.create(spec, {
  name: 'Manage Apps',
  key: 'manage_apps',
  description: `List, create, update, or delete Ably applications using the Control API.
Supports listing all apps in an account, creating new apps, updating app settings, and deleting apps.`,
  instructions: [
    'Requires Control API Token authentication.',
    'Call who_am_i to discover the account ID, then use list to discover app IDs. Saved config IDs remain fallbacks.',
    'App ID is required for update and delete operations.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      accountId: accountIdInput,
      appId: appIdInput,
      name: z
        .string()
        .optional()
        .describe('App name. Required for create, optional for update.'),
      status: z.enum(['enabled', 'disabled']).optional().describe('App status'),
      tlsOnly: z.boolean().optional().describe('Whether to enforce TLS-only connections')
    })
  )
  .output(
    z.object({
      apps: z.array(z.any()).optional().describe('List of apps (list action)'),
      app: z.any().optional().describe('Created or updated app details'),
      deleted: z.boolean().optional().describe('Whether the app was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AblyControlClient(ctx.auth.token, ctx.auth.authType);
    let accountId = ctx.input.accountId || ctx.config.accountId;

    if (ctx.input.action === 'list') {
      if (!accountId)
        throw createApiServiceError(
          'accountId is required for listing apps. Call who_am_i to discover it, then supply accountId.'
        );
      let apps = await client.listApps(accountId);
      return {
        output: { apps },
        message: `Found **${apps.length}** app(s) in account.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!accountId)
        throw createApiServiceError(
          'accountId is required for creating apps. Call who_am_i to discover it, then supply accountId.'
        );
      if (!ctx.input.name)
        throw createApiServiceError('name is required for creating an app.');
      let app = await client.createApp(accountId, {
        name: ctx.input.name,
        status: ctx.input.status,
        tlsOnly: ctx.input.tlsOnly
      });
      return {
        output: { app },
        message: `Created app **${app.name}** (ID: ${app.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      let appId = ctx.input.appId || ctx.config.appId;
      if (!appId) throw createApiServiceError('appId is required for updating an app.');
      let app = await client.updateApp(appId, {
        name: ctx.input.name,
        status: ctx.input.status,
        tlsOnly: ctx.input.tlsOnly
      });
      return {
        output: { app },
        message: `Updated app **${app.name}** (ID: ${app.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      let appId = ctx.input.appId || ctx.config.appId;
      if (!appId) throw createApiServiceError('appId is required for deleting an app.');
      await client.deleteApp(appId);
      return {
        output: { deleted: true },
        message: `Deleted app **${appId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
