import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AblyControlClient } from '../lib/control-client';
import { appIdInput } from '../lib/schemas';
import { validateInteger } from '../lib/validation';
import { spec } from '../spec';

export let manageNamespaces = SlateTool.create(spec, {
  name: 'Manage Namespaces',
  key: 'manage_namespaces',
  description: `List, create, update, or delete Ably channel namespaces using the Control API.
Namespaces define channel-level settings such as message persistence, push notification enablement, and TLS enforcement.
A namespace applies to all channels whose name starts with the namespace ID followed by a colon (e.g. namespace "chat" applies to channels "chat:room1", "chat:room2", etc.).`,
  instructions: [
    'Requires Control API Token authentication.',
    'App ID is required for all operations.',
    'The namespace ID is the prefix used in channel names.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      appId: appIdInput,
      namespaceId: z
        .string()
        .optional()
        .describe(
          'Namespace ID (the channel prefix). Required for create, update, and delete.'
        ),
      authenticated: z
        .boolean()
        .optional()
        .describe('Require identified clients for channels in this namespace'),
      batchingEnabled: z.boolean().optional().describe('Enable server-side message batching'),
      batchingInterval: z
        .number()
        .optional()
        .describe('Batching interval in milliseconds, from 20 to 1000'),
      conflationEnabled: z.boolean().optional().describe('Enable message conflation'),
      conflationInterval: z
        .number()
        .optional()
        .describe('Conflation interval in milliseconds'),
      conflationKey: z.string().optional().describe('Message routing key used for conflation'),
      mutableMessages: z
        .boolean()
        .optional()
        .describe('Allow published messages to be updated or deleted'),
      populateChannelRegistry: z
        .boolean()
        .optional()
        .describe('Include matching channels in the channel registry'),
      persisted: z
        .boolean()
        .optional()
        .describe('Whether messages should be persisted for this namespace'),
      persistLast: z
        .boolean()
        .optional()
        .describe('Whether to persist the last message on each channel'),
      pushEnabled: z
        .boolean()
        .optional()
        .describe('Whether push notifications are enabled for this namespace'),
      tlsOnly: z
        .boolean()
        .optional()
        .describe('Whether to enforce TLS-only connections for this namespace'),
      exposeTimeserial: z
        .boolean()
        .optional()
        .describe('Whether to expose timeserials in messages')
    })
  )
  .output(
    z.object({
      namespaces: z.array(z.any()).optional().describe('List of namespaces (list action)'),
      namespace: z.any().optional().describe('Created or updated namespace details'),
      deleted: z.boolean().optional().describe('Whether the namespace was deleted')
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
      let namespaces = await client.listNamespaces(appId);
      return {
        output: { namespaces },
        message: `Found **${namespaces.length}** namespace(s) for app **${appId}**.`
      };
    }

    if (ctx.input.action === 'create' || ctx.input.action === 'update') {
      validateInteger('batchingInterval', ctx.input.batchingInterval, 20, 1000);
      validateInteger('conflationInterval', ctx.input.conflationInterval, 1);
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.namespaceId)
        throw createApiServiceError('namespaceId is required for creating a namespace.');
      let namespace = await client.createNamespace(appId, {
        id: ctx.input.namespaceId,
        persisted: ctx.input.persisted,
        persistLast: ctx.input.persistLast,
        pushEnabled: ctx.input.pushEnabled,
        tlsOnly: ctx.input.tlsOnly,
        exposeTimeserial: ctx.input.exposeTimeserial,
        authenticated: ctx.input.authenticated,
        batchingEnabled: ctx.input.batchingEnabled,
        batchingInterval: ctx.input.batchingInterval,
        conflationEnabled: ctx.input.conflationEnabled,
        conflationInterval: ctx.input.conflationInterval,
        conflationKey: ctx.input.conflationKey,
        mutableMessages: ctx.input.mutableMessages,
        populateChannelRegistry: ctx.input.populateChannelRegistry
      });
      return {
        output: { namespace },
        message: `Created namespace **${ctx.input.namespaceId}** in app **${appId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.namespaceId)
        throw createApiServiceError('namespaceId is required for updating a namespace.');
      let namespace = await client.updateNamespace(appId, ctx.input.namespaceId, {
        persisted: ctx.input.persisted,
        persistLast: ctx.input.persistLast,
        pushEnabled: ctx.input.pushEnabled,
        tlsOnly: ctx.input.tlsOnly,
        exposeTimeserial: ctx.input.exposeTimeserial,
        authenticated: ctx.input.authenticated,
        batchingEnabled: ctx.input.batchingEnabled,
        batchingInterval: ctx.input.batchingInterval,
        conflationEnabled: ctx.input.conflationEnabled,
        conflationInterval: ctx.input.conflationInterval,
        conflationKey: ctx.input.conflationKey,
        mutableMessages: ctx.input.mutableMessages,
        populateChannelRegistry: ctx.input.populateChannelRegistry
      });
      return {
        output: { namespace },
        message: `Updated namespace **${ctx.input.namespaceId}** in app **${appId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.namespaceId)
        throw createApiServiceError('namespaceId is required for deleting a namespace.');
      await client.deleteNamespace(appId, ctx.input.namespaceId);
      return {
        output: { deleted: true },
        message: `Deleted namespace **${ctx.input.namespaceId}** from app **${appId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
