import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Triggers when messages are created, updated, or deleted in Webex spaces. Optionally filter by specific space, room type, person, or email.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated', 'deleted']).describe('Type of message event'),
      webhookPayload: z.any().describe('Raw webhook notification payload from Webex')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the message'),
      roomId: z.string().optional().describe('ID of the space'),
      roomType: z.string().optional().describe('Type of room (direct or group)'),
      personId: z.string().optional().describe('ID of the message author'),
      personEmail: z.string().optional().describe('Email of the message author'),
      text: z.string().optional().describe('Plain text content of the message'),
      markdown: z.string().optional().describe('Markdown content'),
      html: z.string().optional().describe('HTML content'),
      files: z.array(z.string()).optional().describe('Attached file URLs'),
      mentionedPeople: z.array(z.string()).optional().describe('IDs of mentioned people'),
      parentId: z.string().optional().describe('Parent message ID for thread replies'),
      created: z.string().optional().describe('Creation timestamp'),
      updated: z.string().optional().describe('Last updated timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new WebexClient({ token: ctx.auth.token });

      let events = ['created', 'updated', 'deleted'];
      let webhookIds: string[] = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          name: `Slates Message ${event}`,
          targetUrl: ctx.input.webhookBaseUrl,
          resource: 'messages',
          event
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WebexClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds || []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event,
            webhookPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.webhookPayload;
      let resourceData = payload.data || {};

      // For created and updated events, fetch full message details
      let message = resourceData;
      if (ctx.input.eventType !== 'deleted' && resourceData.id) {
        try {
          let client = new WebexClient({ token: ctx.auth.token });
          message = await client.getMessage(resourceData.id);
        } catch {
          // Fall back to webhook data if we can't fetch details
        }
      }

      return {
        type: `message.${ctx.input.eventType}`,
        id: payload.id || resourceData.id || `msg-${Date.now()}`,
        output: {
          messageId: message.id || resourceData.id,
          roomId: message.roomId || resourceData.roomId,
          roomType: message.roomType || resourceData.roomType,
          personId: message.personId || resourceData.personId,
          personEmail: message.personEmail || resourceData.personEmail,
          text: message.text,
          markdown: message.markdown,
          html: message.html,
          files: message.files,
          mentionedPeople: message.mentionedPeople,
          parentId: message.parentId,
          created: message.created || resourceData.created,
          updated: message.updated
        }
      };
    }
  })
  .build();
