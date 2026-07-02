import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let conversationEventTypes = [
  'conversation_opened',
  'conversation_snoozed',
  'conversation_done'
] as const;

export let conversationEvents = SlateTrigger.create(spec, {
  name: 'Conversation Events',
  key: 'conversation_events',
  description: 'Triggered when conversations are opened, snoozed, or marked as done.'
})
  .input(
    z.object({
      eventType: z.enum(conversationEventTypes).describe('Type of conversation event'),
      eventId: z.string().describe('Unique event identifier'),
      conversationId: z.string().describe('Conversation ID'),
      conversationUrl: z.string().optional().describe('Conversation resource URL'),
      status: z.string().optional().describe('Conversation status'),
      snoozedUntil: z.string().optional().nullable().describe('Snooze expiry timestamp'),
      channelId: z.string().optional().describe('Channel ID'),
      channelType: z.string().optional().describe('Channel type'),
      assignedUsers: z
        .array(
          z.object({
            userId: z.string().optional(),
            email: z.string().optional()
          })
        )
        .optional()
        .describe('Assigned users'),
      labels: z
        .array(
          z.object({
            labelId: z.string().optional(),
            name: z.string().optional()
          })
        )
        .optional()
        .describe('Conversation labels'),
      inboxId: z.string().optional().nullable().describe('Inbox ID'),
      contactId: z.string().optional().describe('Primary contact ID')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Conversation ID'),
      conversationUrl: z.string().optional().describe('Conversation resource URL'),
      status: z.string().optional().describe('Conversation status'),
      snoozedUntil: z.string().optional().nullable().describe('Snooze expiry timestamp'),
      channelId: z.string().optional().describe('Channel ID'),
      channelType: z.string().optional().describe('Channel type'),
      assignedUsers: z
        .array(
          z.object({
            userId: z.string().optional(),
            email: z.string().optional()
          })
        )
        .optional()
        .describe('Assigned users'),
      labels: z
        .array(
          z.object({
            labelId: z.string().optional(),
            name: z.string().optional()
          })
        )
        .optional()
        .describe('Conversation labels'),
      inboxId: z.string().optional().nullable().describe('Inbox ID'),
      contactId: z.string().optional().describe('Primary contact ID')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new SuperchatClient({ token: ctx.auth.token });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        { type: 'conversation_opened' },
        { type: 'conversation_snoozed' },
        { type: 'conversation_done' }
      ]);

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new SuperchatClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let conversation = data.conversation || data.payload?.conversation || {};
      let channel = conversation.channel || {};
      let contacts = conversation.contacts || [];

      return {
        inputs: [
          {
            eventType: data.event,
            eventId: data.id,
            conversationId: conversation.id || data.id,
            conversationUrl: conversation.url,
            status: conversation.status,
            snoozedUntil: conversation.snoozed_until,
            channelId: channel.id,
            channelType: channel.type,
            assignedUsers: conversation.assigned_users?.map((u: any) => ({
              userId: u.id,
              email: u.email
            })),
            labels: conversation.labels?.map((l: any) => ({
              labelId: l.id,
              name: l.name
            })),
            inboxId: conversation.inbox?.id || conversation.inbox_id,
            contactId: contacts[0]?.id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          conversationId: ctx.input.conversationId,
          conversationUrl: ctx.input.conversationUrl,
          status: ctx.input.status,
          snoozedUntil: ctx.input.snoozedUntil,
          channelId: ctx.input.channelId,
          channelType: ctx.input.channelType,
          assignedUsers: ctx.input.assignedUsers,
          labels: ctx.input.labels,
          inboxId: ctx.input.inboxId,
          contactId: ctx.input.contactId
        }
      };
    }
  })
  .build();
