import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Store Events',
  key: 'message_events',
  description:
    'Triggers when messages (voicemail, fax, SMS) are received or updated in the message store.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique identifier for this event'),
      extensionId: z.string().describe('Extension ID that received the message store change'),
      changes: z
        .array(
          z.object({
            type: z.string().describe('Message type (Fax, VoiceMail, SMS, Pager)'),
            newCount: z.number().describe('Number of new messages of this type'),
            updatedCount: z.number().describe('Number of updated messages of this type')
          })
        )
        .describe('Array of message store changes by type')
    })
  )
  .output(
    z.object({
      extensionId: z.string().describe('Extension ID that received the change'),
      messageType: z.string().describe('Type of message (Fax, VoiceMail, SMS, Pager)'),
      newCount: z.number().describe('Number of new messages'),
      updatedCount: z.number().describe('Number of updated messages')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

      let subscription = await client.createSubscription(
        ['/restapi/v1.0/account/~/extension/~/message-store'],
        ctx.input.webhookBaseUrl
      );

      return {
        registrationDetails: {
          subscriptionId: subscription.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
      let details = ctx.input.registrationDetails as { subscriptionId: string };
      await client.deleteSubscription(details.subscriptionId);
    },

    handleRequest: async ctx => {
      // Handle RingCentral Validation-Token header (sent during subscription creation)
      let validationToken = ctx.request.headers.get('Validation-Token');
      if (validationToken) {
        return { inputs: [] };
      }

      let body = (await ctx.request.json()) as any;

      let eventId = body.uuid || `${body.subscriptionId}-${body.timestamp || Date.now()}`;
      let extensionId = body.ownerId || body.body?.extensionId || '';
      let changes = (body.body?.changes || []).map((c: any) => ({
        type: c.type || '',
        newCount: c.newCount || 0,
        updatedCount: c.updatedCount || 0
      }));

      if (changes.length === 0) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventId,
            extensionId: String(extensionId),
            changes
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let changes = ctx.input.changes as Array<{
        type: string;
        newCount: number;
        updatedCount: number;
      }>;
      let firstChange = changes[0] || { type: 'Unknown', newCount: 0, updatedCount: 0 };

      let typeMap: Record<string, string> = {
        Fax: 'message_store.fax_received',
        VoiceMail: 'message_store.voicemail_received',
        SMS: 'message_store.sms_received',
        Pager: 'message_store.pager_received'
      };

      let eventType =
        typeMap[firstChange.type] ||
        `message_store.${firstChange.type.toLowerCase()}_received`;

      return {
        type: eventType,
        id: `${ctx.input.eventId}-0`,
        output: {
          extensionId: ctx.input.extensionId,
          messageType: firstChange.type,
          newCount: firstChange.newCount,
          updatedCount: firstChange.updatedCount
        }
      };
    }
  })
  .build();
