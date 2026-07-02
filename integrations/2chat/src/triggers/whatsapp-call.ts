import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let whatsappCallTrigger = SlateTrigger.create(spec, {
  name: 'WhatsApp Call',
  key: 'whatsapp_call',
  description: 'Triggers when a WhatsApp call is received or made from a connected number.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of call event'),
      eventId: z.string().describe('Unique identifier for this event'),
      fromNumber: z.string().optional().describe('Caller phone number'),
      toNumber: z.string().optional().describe('Callee phone number'),
      onNumber: z.string().optional().describe('Connected WhatsApp number'),
      callType: z.string().optional().describe('Type of call (voice/video)'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.any().optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      fromNumber: z.string().optional().describe('Caller phone number'),
      toNumber: z.string().optional().describe('Callee phone number'),
      onNumber: z.string().optional().describe('Connected WhatsApp number'),
      callType: z.string().optional().describe('Type of call (voice/video)'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TwoChatClient({ token: ctx.auth.token });

      let numbersResult = await client.listWhatsAppNumbers();
      let numbers = numbersResult.numbers || numbersResult.data || [];

      let events = ['whatsapp.call.received', 'whatsapp.call.made'];

      let registrations: Array<{ webhookUuid: string; event: string; onNumber: string }> = [];

      for (let num of numbers) {
        let phoneNumber = num.phone_number || num.number;
        if (!phoneNumber) continue;

        for (let event of events) {
          try {
            let result = await client.subscribeWebhook({
              hookUrl: ctx.input.webhookBaseUrl,
              onNumber: phoneNumber,
              event
            });
            registrations.push({
              webhookUuid: result.uuid || result.webhook_uuid || result.id,
              event,
              onNumber: phoneNumber
            });
          } catch (_e) {
            // Some events may not be supported for all number types
          }
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

      let eventType = data.event || data.type || '';
      let call = data.call || data.payload || data;

      return {
        inputs: [
          {
            eventType,
            eventId: call.uuid || call.id || `${eventType}-${Date.now()}`,
            fromNumber: call.from_number || call.from || data.from_number,
            toNumber: call.to_number || call.to || data.to_number,
            onNumber: data.on_number || data.channel_number,
            callType: call.call_type || call.type,
            timestamp: call.timestamp || call.created_at || data.timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventMap: Record<string, string> = {
        'whatsapp.call.received': 'whatsapp_call.received',
        'whatsapp.call.made': 'whatsapp_call.made'
      };

      return {
        type:
          eventMap[ctx.input.eventType] ||
          `whatsapp_call.${ctx.input.eventType.split('.').pop()}`,
        id: ctx.input.eventId,
        output: {
          fromNumber: ctx.input.fromNumber,
          toNumber: ctx.input.toNumber,
          onNumber: ctx.input.onNumber,
          callType: ctx.input.callType,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
