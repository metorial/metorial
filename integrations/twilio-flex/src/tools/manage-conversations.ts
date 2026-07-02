import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConversationsClient } from '../lib/conversations-client';
import { spec } from '../spec';

let conversationSchema = z.object({
  conversationSid: z.string().describe('Conversation SID'),
  friendlyName: z.string().optional().describe('Friendly name'),
  uniqueName: z.string().optional().describe('Unique name'),
  state: z.string().optional().describe('Conversation state (active, inactive, closed)'),
  chatServiceSid: z.string().optional().describe('Chat Service SID'),
  messagingServiceSid: z.string().optional().describe('Messaging Service SID'),
  dateCreated: z.string().optional().describe('Date created'),
  dateUpdated: z.string().optional().describe('Date updated')
});

export let manageConversationsTool = SlateTool.create(spec, {
  name: 'Manage Conversations',
  key: 'manage_conversations',
  description: `Create, read, update, delete, or list Twilio Conversations. Conversations are the container for multi-party messaging across channels. Use this to set up new conversation threads, update their state, or retrieve conversation details.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Action to perform'),
      conversationSid: z
        .string()
        .optional()
        .describe('Conversation SID (required for get/update/delete)'),
      friendlyName: z.string().optional().describe('Friendly name'),
      uniqueName: z.string().optional().describe('Unique name'),
      state: z
        .enum(['active', 'inactive', 'closed'])
        .optional()
        .describe('Conversation state'),
      messagingServiceSid: z.string().optional().describe('Messaging Service SID'),
      timersInactive: z.string().optional().describe('ISO 8601 duration for inactive timer'),
      timersClosed: z.string().optional().describe('ISO 8601 duration for closed timer'),
      pageSize: z.number().optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      conversations: z.array(conversationSchema).describe('Conversation records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConversationsClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let result = await client.listConversations(ctx.input.pageSize);
      let conversations = (result.conversations || []).map((c: any) => ({
        conversationSid: c.sid,
        friendlyName: c.friendly_name,
        uniqueName: c.unique_name,
        state: c.state,
        chatServiceSid: c.chat_service_sid,
        messagingServiceSid: c.messaging_service_sid,
        dateCreated: c.date_created,
        dateUpdated: c.date_updated
      }));
      return {
        output: { conversations },
        message: `Found **${conversations.length}** conversations.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.conversationSid) throw new Error('conversationSid is required');
      let c = await client.getConversation(ctx.input.conversationSid);
      return {
        output: {
          conversations: [
            {
              conversationSid: c.sid,
              friendlyName: c.friendly_name,
              uniqueName: c.unique_name,
              state: c.state,
              chatServiceSid: c.chat_service_sid,
              messagingServiceSid: c.messaging_service_sid,
              dateCreated: c.date_created,
              dateUpdated: c.date_updated
            }
          ]
        },
        message: `Conversation **${c.friendly_name || c.sid}** is **${c.state}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let params: Record<string, string | undefined> = {
        FriendlyName: ctx.input.friendlyName,
        UniqueName: ctx.input.uniqueName,
        State: ctx.input.state,
        MessagingServiceSid: ctx.input.messagingServiceSid,
        'Timers.Inactive': ctx.input.timersInactive,
        'Timers.Closed': ctx.input.timersClosed
      };
      let c = await client.createConversation(params);
      return {
        output: {
          conversations: [
            {
              conversationSid: c.sid,
              friendlyName: c.friendly_name,
              uniqueName: c.unique_name,
              state: c.state,
              chatServiceSid: c.chat_service_sid,
              messagingServiceSid: c.messaging_service_sid,
              dateCreated: c.date_created,
              dateUpdated: c.date_updated
            }
          ]
        },
        message: `Created conversation **${c.friendly_name || c.sid}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.conversationSid) throw new Error('conversationSid is required');
      let params: Record<string, string | undefined> = {
        FriendlyName: ctx.input.friendlyName,
        UniqueName: ctx.input.uniqueName,
        State: ctx.input.state,
        MessagingServiceSid: ctx.input.messagingServiceSid,
        'Timers.Inactive': ctx.input.timersInactive,
        'Timers.Closed': ctx.input.timersClosed
      };
      let c = await client.updateConversation(ctx.input.conversationSid, params);
      return {
        output: {
          conversations: [
            {
              conversationSid: c.sid,
              friendlyName: c.friendly_name,
              uniqueName: c.unique_name,
              state: c.state,
              chatServiceSid: c.chat_service_sid,
              messagingServiceSid: c.messaging_service_sid,
              dateCreated: c.date_created,
              dateUpdated: c.date_updated
            }
          ]
        },
        message: `Updated conversation **${c.friendly_name || c.sid}**.`
      };
    }

    // delete
    if (!ctx.input.conversationSid) throw new Error('conversationSid is required');
    await client.deleteConversation(ctx.input.conversationSid);
    return {
      output: {
        conversations: [
          {
            conversationSid: ctx.input.conversationSid
          }
        ]
      },
      message: `Deleted conversation **${ctx.input.conversationSid}**.`
    };
  })
  .build();
