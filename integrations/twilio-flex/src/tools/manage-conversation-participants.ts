import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConversationsClient } from '../lib/conversations-client';
import { spec } from '../spec';

let participantSchema = z.object({
  participantSid: z.string().describe('Participant SID'),
  conversationSid: z.string().optional().describe('Conversation SID'),
  identity: z.string().optional().describe('Participant identity'),
  messagingBindingAddress: z
    .string()
    .optional()
    .describe('Messaging binding address (phone number)'),
  messagingBindingProxyAddress: z
    .string()
    .optional()
    .describe('Messaging binding proxy address'),
  roleSid: z.string().optional().describe('Role SID'),
  dateCreated: z.string().optional().describe('Date created'),
  dateUpdated: z.string().optional().describe('Date updated')
});

export let manageConversationParticipantsTool = SlateTool.create(spec, {
  name: 'Manage Conversation Participants',
  key: 'manage_conversation_participants',
  description: `Add, remove, update, or list participants in a Twilio Conversation. Participants can be chat-based (identity) or SMS/WhatsApp-based (phone number). Use this to manage who is part of a conversation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove', 'update', 'list', 'get']).describe('Action to perform'),
      conversationSid: z.string().describe('Conversation SID'),
      participantSid: z
        .string()
        .optional()
        .describe('Participant SID (required for remove/update/get)'),
      identity: z
        .string()
        .optional()
        .describe('Chat participant identity (for chat-based participants)'),
      messagingBindingAddress: z
        .string()
        .optional()
        .describe('Phone number for SMS/WhatsApp participant (e.g., "+1234567890")'),
      messagingBindingProxyAddress: z
        .string()
        .optional()
        .describe('Twilio phone number for proxy (e.g., "+0987654321")'),
      roleSid: z.string().optional().describe('Role SID to assign to the participant'),
      attributes: z.string().optional().describe('JSON string of participant attributes'),
      pageSize: z.number().optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      participants: z.array(participantSchema).describe('Participant records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConversationsClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let result = await client.listParticipants(
        ctx.input.conversationSid,
        ctx.input.pageSize
      );
      let participants = (result.participants || []).map((p: any) => ({
        participantSid: p.sid,
        conversationSid: p.conversation_sid,
        identity: p.identity,
        messagingBindingAddress: p.messaging_binding?.address,
        messagingBindingProxyAddress: p.messaging_binding?.proxy_address,
        roleSid: p.role_sid,
        dateCreated: p.date_created,
        dateUpdated: p.date_updated
      }));
      return {
        output: { participants },
        message: `Found **${participants.length}** participants in conversation.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.participantSid) throw new Error('participantSid is required');
      let p = await client.getParticipant(ctx.input.conversationSid, ctx.input.participantSid);
      return {
        output: {
          participants: [
            {
              participantSid: p.sid,
              conversationSid: p.conversation_sid,
              identity: p.identity,
              messagingBindingAddress: p.messaging_binding?.address,
              messagingBindingProxyAddress: p.messaging_binding?.proxy_address,
              roleSid: p.role_sid,
              dateCreated: p.date_created,
              dateUpdated: p.date_updated
            }
          ]
        },
        message: `Participant **${p.sid}** (${p.identity || p.messaging_binding?.address || 'unknown'}).`
      };
    }

    if (ctx.input.action === 'add') {
      let params: Record<string, string | undefined> = {
        Identity: ctx.input.identity,
        'MessagingBinding.Address': ctx.input.messagingBindingAddress,
        'MessagingBinding.ProxyAddress': ctx.input.messagingBindingProxyAddress,
        RoleSid: ctx.input.roleSid,
        Attributes: ctx.input.attributes
      };
      let p = await client.addParticipant(ctx.input.conversationSid, params);
      return {
        output: {
          participants: [
            {
              participantSid: p.sid,
              conversationSid: p.conversation_sid,
              identity: p.identity,
              messagingBindingAddress: p.messaging_binding?.address,
              messagingBindingProxyAddress: p.messaging_binding?.proxy_address,
              roleSid: p.role_sid,
              dateCreated: p.date_created,
              dateUpdated: p.date_updated
            }
          ]
        },
        message: `Added participant **${p.sid}** to conversation.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.participantSid) throw new Error('participantSid is required');
      let params: Record<string, string | undefined> = {
        RoleSid: ctx.input.roleSid,
        Attributes: ctx.input.attributes,
        'MessagingBinding.ProxyAddress': ctx.input.messagingBindingProxyAddress
      };
      let p = await client.updateParticipant(
        ctx.input.conversationSid,
        ctx.input.participantSid,
        params
      );
      return {
        output: {
          participants: [
            {
              participantSid: p.sid,
              conversationSid: p.conversation_sid,
              identity: p.identity,
              messagingBindingAddress: p.messaging_binding?.address,
              messagingBindingProxyAddress: p.messaging_binding?.proxy_address,
              roleSid: p.role_sid,
              dateCreated: p.date_created,
              dateUpdated: p.date_updated
            }
          ]
        },
        message: `Updated participant **${p.sid}**.`
      };
    }

    // remove
    if (!ctx.input.participantSid) throw new Error('participantSid is required');
    await client.removeParticipant(ctx.input.conversationSid, ctx.input.participantSid);
    return {
      output: {
        participants: [
          {
            participantSid: ctx.input.participantSid,
            conversationSid: ctx.input.conversationSid
          }
        ]
      },
      message: `Removed participant **${ctx.input.participantSid}** from conversation.`
    };
  })
  .build();
