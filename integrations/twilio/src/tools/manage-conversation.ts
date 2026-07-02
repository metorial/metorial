import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { twilioServiceError } from '../lib/errors';
import { spec } from '../spec';

let conversationSchema = z.object({
  conversationSid: z.string().describe('Unique SID of the conversation (starts with CH)'),
  friendlyName: z.string().nullable().describe('Friendly name of the conversation'),
  uniqueName: z.string().nullable().describe('Unique name of the conversation'),
  state: z.string().describe('Conversation state (active, inactive, closed)'),
  attributes: z.string().nullable().describe('JSON string of custom attributes'),
  dateCreated: z.string().nullable().describe('Date the conversation was created'),
  dateUpdated: z.string().nullable().describe('Date the conversation was last updated')
});

export let manageConversation = SlateTool.create(spec, {
  name: 'Manage Conversation',
  key: 'manage_conversation',
  description: `Create, list, update, or delete Twilio Conversations. Conversations support multi-channel messaging across SMS, WhatsApp, and chat. Use this to manage conversation lifecycle and metadata.`,
  instructions: [
    'Set "action" to "create" to start a new conversation.',
    'Set "action" to "list" to retrieve conversations, optionally filtered by state.',
    'Set "action" to "update" to modify an existing conversation\'s name, state, or attributes.',
    'Set "action" to "delete" to remove a conversation.',
    'Set "action" to "get" to fetch a single conversation by SID.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'update', 'delete'])
        .describe('Action to perform on conversations.'),
      conversationSid: z
        .string()
        .optional()
        .describe('SID of the conversation (required for get, update, delete).'),
      friendlyName: z.string().optional().describe('Friendly name (for create or update).'),
      uniqueName: z.string().optional().describe('Unique name (for create or update).'),
      state: z
        .enum(['active', 'inactive', 'closed'])
        .optional()
        .describe('Conversation state (for create, update, or list filter).'),
      attributes: z
        .string()
        .optional()
        .describe('JSON string of custom attributes (for create or update).'),
      messagingServiceSid: z
        .string()
        .optional()
        .describe('Messaging Service SID to associate with the conversation (for create).'),
      pageSize: z.number().optional().describe('Number of results for list (default 50).')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(conversationSchema)
        .optional()
        .describe('Conversation(s) affected by the action'),
      deleted: z.boolean().optional().describe('Whether the conversation was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let mapConversation = (c: any) => ({
      conversationSid: c.sid,
      friendlyName: c.friendly_name || null,
      uniqueName: c.unique_name || null,
      state: c.state,
      attributes: c.attributes || null,
      dateCreated: c.date_created || null,
      dateUpdated: c.date_updated || null
    });

    if (ctx.input.action === 'create') {
      let result = await client.createConversation({
        friendlyName: ctx.input.friendlyName,
        uniqueName: ctx.input.uniqueName,
        state: ctx.input.state,
        attributes: ctx.input.attributes,
        messagingServiceSid: ctx.input.messagingServiceSid
      });
      return {
        output: { conversations: [mapConversation(result)] },
        message: `Created conversation **${result.sid}**${result.friendly_name ? ` ("${result.friendly_name}")` : ''}.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.conversationSid)
        throw twilioServiceError('conversationSid is required for get action');
      let result = await client.getConversation(ctx.input.conversationSid);
      return {
        output: { conversations: [mapConversation(result)] },
        message: `Fetched conversation **${result.sid}** (state: **${result.state}**).`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listConversations({
        pageSize: ctx.input.pageSize,
        state: ctx.input.state
      });
      let conversations = (result.conversations || []).map(mapConversation);
      return {
        output: { conversations },
        message: `Found **${conversations.length}** conversation(s).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.conversationSid)
        throw twilioServiceError('conversationSid is required for update action');
      let result = await client.updateConversation(ctx.input.conversationSid, {
        friendlyName: ctx.input.friendlyName,
        uniqueName: ctx.input.uniqueName,
        state: ctx.input.state,
        attributes: ctx.input.attributes
      });
      return {
        output: { conversations: [mapConversation(result)] },
        message: `Updated conversation **${result.sid}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.conversationSid)
        throw twilioServiceError('conversationSid is required for delete action');
      await client.deleteConversation(ctx.input.conversationSid);
      return {
        output: { deleted: true },
        message: `Deleted conversation **${ctx.input.conversationSid}**.`
      };
    }

    throw twilioServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
