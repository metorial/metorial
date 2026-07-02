import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let whatsappNumberStatusTrigger = SlateTrigger.create(spec, {
  name: 'WhatsApp Number Status',
  key: 'whatsapp_number_status',
  description:
    'Triggers when a connected WhatsApp number changes status (e.g., ready, disconnected, loading, initializing, qr-received).'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      eventId: z.string().describe('Unique identifier for this event'),
      phoneNumber: z.string().optional().describe('The WhatsApp number that changed status'),
      status: z
        .string()
        .optional()
        .describe('New status (ready, disconnected, qr-received, loading, initializing)'),
      reason: z
        .string()
        .optional()
        .describe('Reason for the status change (e.g., disconnection reason)'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.any().optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      phoneNumber: z.string().optional().describe('The WhatsApp number that changed status'),
      status: z.string().optional().describe('New status'),
      reason: z.string().optional().describe('Reason for the status change'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TwoChatClient({ token: ctx.auth.token });

      let numbersResult = await client.listWhatsAppNumbers();
      let numbers = numbersResult.numbers || numbersResult.data || [];

      let registrations: Array<{ webhookUuid: string; event: string; onNumber: string }> = [];

      for (let num of numbers) {
        let phoneNumber = num.phone_number || num.number;
        if (!phoneNumber) continue;

        try {
          let result = await client.subscribeWebhook({
            hookUrl: ctx.input.webhookBaseUrl,
            onNumber: phoneNumber,
            event: 'whatsapp.number.status'
          });
          registrations.push({
            webhookUuid: result.uuid || result.webhook_uuid || result.id,
            event: 'whatsapp.number.status',
            onNumber: phoneNumber
          });
        } catch (_e) {
          // May not be supported for all number types
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TwoChatClient({ token: ctx.auth.token });
      let registrations = ctx.input.registrationDetails?.registrations || [];

      for (let reg of registrations) {
        try {
          if (reg.webhookUuid) {
            await client.deleteWebhook(reg.webhookUuid);
          }
        } catch (_e) {
          // Best-effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let payload = data.payload || data;

      return {
        inputs: [
          {
            eventType: data.event || 'whatsapp.number.status',
            eventId: payload.uuid || `status-${Date.now()}`,
            phoneNumber: payload.phone_number || payload.number || data.on_number,
            status: payload.status || payload.state,
            reason: payload.reason || payload.disconnect_reason,
            timestamp: payload.timestamp || data.timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'whatsapp_number.status_changed',
        id: ctx.input.eventId,
        output: {
          phoneNumber: ctx.input.phoneNumber,
          status: ctx.input.status,
          reason: ctx.input.reason,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
