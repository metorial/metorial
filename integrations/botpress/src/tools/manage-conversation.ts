import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RuntimeClient } from '../lib/client';
import { resolveRuntimeParams, runtimeScopeFields } from '../lib/schemas';
import { spec } from '../spec';

const conversationSchema = z.object({
  conversationId: z.string(),
  channel: z.string().optional(),
  integration: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tags: z.record(z.string(), z.string()).optional()
});
const mapConversation = (conversation: Record<string, unknown>) => ({
  conversationId: conversation.id as string,
  channel: conversation.channel as string | undefined,
  integration: conversation.integration as string | undefined,
  createdAt: conversation.createdAt as string,
  updatedAt: conversation.updatedAt as string,
  tags: conversation.tags as Record<string, string> | undefined
});

export let manageConversationTool = SlateTool.create(spec, {
  name: 'Manage Conversation',
  key: 'manage_conversation',
  description:
    'Create, get, update, delete, or list bot conversations and manage their participants. Call list_workspaces then list_bots to discover bot IDs. Creation requires an installed integration channel; use the integration identity fields to act as that integration.',
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum([
        'create',
        'get',
        'get-or-create',
        'list',
        'update',
        'delete',
        'list-participants',
        'add-participant',
        'remove-participant'
      ]),
      ...runtimeScopeFields,
      conversationId: z
        .string()
        .optional()
        .describe('Conversation ID, required except for create, get-or-create, and list.'),
      channel: z
        .string()
        .optional()
        .describe(
          'Installed integration channel name, required for create and get-or-create.'
        ),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Declared conversation tags; required for update, defaults to an empty object for creation.'
        ),
      discriminateByTags: z
        .array(z.string())
        .optional()
        .describe('Tag keys used to match an existing conversation for get-or-create.'),
      userId: z
        .string()
        .optional()
        .describe(
          'User ID required for add-participant and remove-participant. Discover users with manage_user list.'
        ),
      nextToken: z
        .string()
        .optional()
        .describe('Pagination token for list or list-participants.')
    })
  )
  .output(
    z.object({
      conversation: conversationSchema.optional(),
      conversations: z.array(conversationSchema).optional(),
      participants: z.array(z.record(z.string(), z.unknown())).optional(),
      participant: z.record(z.string(), z.unknown()).optional(),
      conversationId: z.string().optional(),
      userId: z.string().optional(),
      deleted: z.boolean().optional(),
      removed: z.boolean().optional(),
      created: z.boolean().optional(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new RuntimeClient({
      token: ctx.auth.token,
      ...resolveRuntimeParams(ctx.input, ctx.config)
    });
    const { action, conversationId, tags, userId } = ctx.input;
    if (action === 'list') {
      const result = await client.listConversations({ nextToken: ctx.input.nextToken });
      const conversations = (result.conversations ?? []).map(mapConversation);
      return {
        output: { conversations, nextToken: result.meta?.nextToken },
        message: `Found **${conversations.length}** conversation(s).`
      };
    }
    if (action === 'create' || action === 'get-or-create') {
      if (!ctx.input.channel?.trim())
        throw createApiServiceError(
          'channel is required for create and get-or-create. Choose an installed integration channel.'
        );
      if (
        action === 'get-or-create' &&
        ctx.input.discriminateByTags?.some(key => tags?.[key] === undefined)
      )
        throw createApiServiceError('Every discriminateByTags key must be present in tags.');
      const data = { channel: ctx.input.channel, tags };
      const result =
        action === 'create'
          ? await client.createConversation(data)
          : await client.getOrCreateConversation({
              ...data,
              discriminateByTags: ctx.input.discriminateByTags
            });
      return {
        output: {
          conversation: mapConversation(result.conversation),
          created: result.meta?.created
        },
        message: `Retrieved or created conversation **${result.conversation.id}**.`
      };
    }
    if (!conversationId?.trim())
      throw createApiServiceError(`conversationId is required for ${action}.`);
    if (action === 'get' || action === 'update') {
      if (action === 'update' && !tags)
        throw createApiServiceError(
          'tags is required for update. Use empty values to unset declared tags.'
        );
      const result =
        action === 'get'
          ? await client.getConversation(conversationId)
          : await client.updateConversation(conversationId, tags ?? {});
      return {
        output: { conversation: mapConversation(result.conversation) },
        message: `Retrieved ${action === 'update' ? 'updated ' : ''}conversation **${conversationId}**.`
      };
    }
    if (action === 'delete') {
      await client.deleteConversation(conversationId);
      return {
        output: { conversationId, deleted: true },
        message: `Deleted conversation **${conversationId}**.`
      };
    }
    if (action === 'list-participants') {
      const result = await client.listParticipants(conversationId, ctx.input.nextToken);
      return {
        output: {
          conversationId,
          participants: result.participants,
          nextToken: result.meta?.nextToken
        },
        message: `Retrieved participants for conversation **${conversationId}**.`
      };
    }
    if (!userId?.trim()) throw createApiServiceError(`userId is required for ${action}.`);
    if (action === 'add-participant') {
      const result = await client.addParticipant(conversationId, userId);
      return {
        output: { conversationId, userId, participant: result.participant },
        message: `Added user **${userId}** to conversation **${conversationId}**.`
      };
    }
    await client.removeParticipant(conversationId, userId);
    return {
      output: { conversationId, userId, removed: true },
      message: `Removed user **${userId}** from conversation **${conversationId}**.`
    };
  })
  .build();
