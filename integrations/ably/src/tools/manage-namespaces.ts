import { SlateTool } from 'slates';
import { z } from 'zod';
import { AblyControlClient } from '../lib/control-client';
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
      appId: z.string().optional().describe('App ID. Overrides config value if provided.'),
      namespaceId: z
        .string()
        .optional()
        .describe(
          'Namespace ID (the channel prefix). Required for create, update, and delete.'
        ),
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
    let client = new AblyControlClient(ctx.auth.token);
    let appId = ctx.input.appId || ctx.config.appId;
    if (!appId) throw new Error('appId is required. Set it in config or input.');

    if (ctx.input.action === 'list') {
      let namespaces = await client.listNamespaces(appId);
      return {
        output: { namespaces },
        message: `Found **${namespaces.length}** namespace(s) for app **${appId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.namespaceId)
        throw new Error('namespaceId is required for creating a namespace.');
      let namespace = await client.createNamespace(appId, {
        id: ctx.input.namespaceId,
        persisted: ctx.input.persisted,
        persistLast: ctx.input.persistLast,
        pushEnabled: ctx.input.pushEnabled,
        tlsOnly: ctx.input.tlsOnly,
        exposeTimeserial: ctx.input.exposeTimeserial
      });
      return {
        output: { namespace },
        message: `Created namespace **${ctx.input.namespaceId}** in app **${appId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.namespaceId)
        throw new Error('namespaceId is required for updating a namespace.');
      let namespace = await client.updateNamespace(appId, ctx.input.namespaceId, {
        persisted: ctx.input.persisted,
        persistLast: ctx.input.persistLast,
        pushEnabled: ctx.input.pushEnabled,
        tlsOnly: ctx.input.tlsOnly,
        exposeTimeserial: ctx.input.exposeTimeserial
      });
      return {
        output: { namespace },
        message: `Updated namespace **${ctx.input.namespaceId}** in app **${appId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.namespaceId)
        throw new Error('namespaceId is required for deleting a namespace.');
      await client.deleteNamespace(appId, ctx.input.namespaceId);
      return {
        output: { deleted: true },
        message: `Deleted namespace **${ctx.input.namespaceId}** from app **${appId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
