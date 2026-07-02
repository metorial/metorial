import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { twilioServiceError } from '../lib/errors';
import { spec } from '../spec';

let participantSchema = z.object({
  participantSid: z.string().describe('Unique SID of the participant'),
  conversationSid: z.string().describe('SID of the conversation'),
  identity: z.string().nullable().describe('Chat identity of the participant'),
  messagingBindingAddress: z
    .string()
    .nullable()
    .describe('Phone number of the SMS/WhatsApp participant'),
  messagingBindingProxyAddress: z
    .string()
    .nullable()
    .describe('Twilio number used as proxy for SMS/WhatsApp'),
  roleSid: z.string().nullable().describe('Role SID assigned to the participant'),
  dateCreated: z.string().nullable().describe('Date the participant was added')
});

export let conversationParticipants = SlateTool.create(spec, {
  name: 'Conversation Participants',
  key: 'conversation_participants',
  description: `Add, list, or remove participants from a Twilio Conversation. Participants can be chat users (by identity) or SMS/WhatsApp users (by phone number with a proxy Twilio number).`,
  instructions: [
    'To add an SMS/WhatsApp participant, provide "messagingBindingAddress" (their phone number) and "messagingBindingProxyAddress" (your Twilio number).',
    'To add a chat participant, provide "identity".',
    'To remove a participant, set action to "remove" and provide "participantSid".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'list', 'remove']).describe('Action to perform on participants.'),
      conversationSid: z.string().describe('SID of the conversation (starts with CH).'),
      identity: z
        .string()
        .optional()
        .describe('Chat identity for a chat/SDK participant (for "add" action).'),
      messagingBindingAddress: z
        .string()
        .optional()
        .describe('Phone number of the SMS/WhatsApp participant (for "add" action).'),
      messagingBindingProxyAddress: z
        .string()
        .optional()
        .describe('Twilio phone number to use as proxy (for "add" action with SMS/WhatsApp).'),
      participantSid: z
        .string()
        .optional()
        .describe('SID of the participant to remove (for "remove" action).'),
      attributes: z
        .string()
        .optional()
        .describe('JSON string of custom attributes (for "add" action).'),
      pageSize: z.number().optional().describe('Number of results for list (default 50).')
    })
  )
  .output(
    z.object({
      participants: z.array(participantSchema).optional().describe('Participant(s) affected'),
      removed: z.boolean().optional().describe('Whether the participant was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let mapParticipant = (p: any) => ({
      participantSid: p.sid,
      conversationSid: p.conversation_sid,
      identity: p.identity || null,
      messagingBindingAddress: p.messaging_binding?.address || null,
      messagingBindingProxyAddress: p.messaging_binding?.proxy_address || null,
      roleSid: p.role_sid || null,
      dateCreated: p.date_created || null
    });

    if (ctx.input.action === 'add') {
      if (!ctx.input.identity && !ctx.input.messagingBindingAddress) {
        throw twilioServiceError(
          'Provide identity for a chat participant or messagingBindingAddress for an SMS/WhatsApp participant.'
        );
      }

      if (ctx.input.messagingBindingAddress && !ctx.input.messagingBindingProxyAddress) {
        throw twilioServiceError(
          'messagingBindingProxyAddress is required when adding an SMS/WhatsApp participant.'
        );
      }

      let result = await client.addConversationParticipant(ctx.input.conversationSid, {
        identity: ctx.input.identity,
        messagingBindingAddress: ctx.input.messagingBindingAddress,
        messagingBindingProxyAddress: ctx.input.messagingBindingProxyAddress,
        attributes: ctx.input.attributes
      });
      return {
        output: { participants: [mapParticipant(result)] },
        message: `Added participant **${result.sid}** to conversation **${ctx.input.conversationSid}**.`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listConversationParticipants(ctx.input.conversationSid, {
        pageSize: ctx.input.pageSize
      });
      let participants = (result.participants || []).map(mapParticipant);
      return {
        output: { participants },
        message: `Found **${participants.length}** participant(s) in conversation **${ctx.input.conversationSid}**.`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.participantSid)
        throw twilioServiceError('participantSid is required for remove action');
      await client.removeConversationParticipant(
        ctx.input.conversationSid,
        ctx.input.participantSid
      );
      return {
        output: { removed: true },
        message: `Removed participant **${ctx.input.participantSid}** from conversation **${ctx.input.conversationSid}**.`
      };
    }

    throw twilioServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
