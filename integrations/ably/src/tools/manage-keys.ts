import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AblyControlClient } from '../lib/control-client';
import { appIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let manageKeys = SlateTool.create(spec, {
  name: 'Manage API Keys',
  key: 'manage_keys',
  description: `List, create, update, or revoke Ably API keys using the Control API.
Keys can be created with channel-specific capabilities, allowing fine-grained access control per channel.`,
  instructions: [
    'Requires Control API Token authentication.',
    'App ID is required for all operations (from config or input).',
    'Capabilities map channel names/patterns to arrays of operations: publish, subscribe, presence, history, push-subscribe, push-admin, channel-metadata, stats. Grant stats on the wildcard resource "*", for example {"*":["stats"]}.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'revoke']).describe('Operation to perform'),
      appId: appIdInput,
      keyId: z
        .string()
        .optional()
        .describe('Key ID. Required for update and revoke operations.'),
      revocableTokens: z
        .boolean()
        .optional()
        .describe(
          'Whether tokens issued by this key can be individually revoked. Used by create and update.'
        ),
      name: z
        .string()
        .optional()
        .describe('Key name. Required for create, optional for update.'),
      capability: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe(
          'Capabilities map: channel name/pattern -> array of operations. Required for create.'
        )
    })
  )
  .output(
    z.object({
      keys: z.array(z.any()).optional().describe('List of API keys (list action)'),
      key: z.any().optional().describe('Created or updated key details'),
      revoked: z.boolean().optional().describe('Whether the key was revoked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AblyControlClient(ctx.auth.token, ctx.auth.authType);
    let appId = ctx.input.appId || ctx.config.appId;
    if (!appId)
      throw createApiServiceError(
        'appId is required. Call manage_apps with action list to discover an app ID, then supply appId.'
      );

    if (ctx.input.action === 'list') {
      let keys = await client.listKeys(appId);
      return {
        output: { keys },
        message: `Found **${keys.length}** API key(s) for app **${appId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw createApiServiceError('name is required for creating a key.');
      if (!ctx.input.capability)
        throw createApiServiceError('capability is required for creating a key.');
      let key = await client.createKey(appId, {
        name: ctx.input.name,
        capability: ctx.input.capability,
        revocableTokens: ctx.input.revocableTokens
      });
      return {
        output: { key },
        message: `Created API key **${key.name}** (ID: ${key.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.keyId)
        throw createApiServiceError('keyId is required for updating a key.');
      let key = await client.updateKey(appId, ctx.input.keyId, {
        name: ctx.input.name,
        capability: ctx.input.capability,
        revocableTokens: ctx.input.revocableTokens
      });
      return {
        output: { key },
        message: `Updated API key **${key.name}** (ID: ${key.id}).`
      };
    }

    if (ctx.input.action === 'revoke') {
      if (!ctx.input.keyId)
        throw createApiServiceError('keyId is required for revoking a key.');
      await client.revokeKey(appId, ctx.input.keyId);
      return {
        output: { revoked: true },
        message: `Revoked API key **${ctx.input.keyId}** for app **${appId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
