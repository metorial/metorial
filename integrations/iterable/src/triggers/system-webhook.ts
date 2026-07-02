import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let systemWebhook = SlateTrigger.create(spec, {
  name: 'System Webhook',
  key: 'system_webhook',
  description:
    'Receives system webhook events from Iterable including email, push, SMS, in-app, web push, embedded messaging, WhatsApp, subscription, and journey events. Configure the webhook URL in Iterable under Integrations > System Webhooks.',
  instructions: [
    'Configure the webhook endpoint URL in the Iterable dashboard at Integrations > System Webhooks.',
    'Select which event categories to receive (email, push, SMS, in-app, web push, etc.).'
  ]
})
  .input(
    z.object({
      eventName: z
        .string()
        .describe('Name of the event (e.g. emailSend, emailOpen, pushBounce, smsSend)'),
      email: z
        .string()
        .optional()
        .describe('Email address of the user associated with the event'),
      userId: z.string().optional().describe('User ID associated with the event'),
      eventFields: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Event-specific data fields including campaign info, template info, timestamps'
        ),
      rawEvent: z.record(z.string(), z.any()).describe('Full raw event payload from Iterable')
    })
  )
  .output(
    z.object({
      eventName: z.string().describe('Name of the Iterable event'),
      email: z.string().optional().describe('Email address of the affected user'),
      userId: z.string().optional().describe('User ID of the affected user'),
      campaignId: z.number().optional().describe('Campaign ID associated with the event'),
      campaignName: z.string().optional().describe('Campaign name associated with the event'),
      templateId: z.number().optional().describe('Template ID associated with the event'),
      templateName: z.string().optional().describe('Template name associated with the event'),
      messageId: z.string().optional().describe('Message ID for the specific send'),
      createdAt: z.string().optional().describe('Timestamp of the event'),
      channel: z
        .string()
        .optional()
        .describe('Messaging channel (email, push, sms, inApp, webPush, embedded, whatsApp)'),
      eventFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional event-specific data fields')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;

      // Iterable sends events individually or as part of a batch
      let events: Record<string, any>[] = Array.isArray(body) ? body : [body];

      let inputs = events.map(event => {
        let eventName = event.eventName || event.type || 'unknown';
        let dataFields = event.dataFields || {};

        return {
          eventName,
          email: event.email,
          userId: event.userId,
          eventFields: dataFields,
          rawEvent: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventName = ctx.input.eventName;
      let raw = ctx.input.rawEvent;
      let dataFields = ctx.input.eventFields || {};

      // Determine the channel from the event name
      let channel: string | undefined;
      if (eventName.startsWith('email')) channel = 'email';
      else if (eventName.startsWith('push')) channel = 'push';
      else if (eventName.startsWith('sms') || eventName.startsWith('SMS')) channel = 'sms';
      else if (eventName.startsWith('inApp')) channel = 'inApp';
      else if (eventName.startsWith('webPush')) channel = 'webPush';
      else if (eventName.startsWith('embedded')) channel = 'embedded';
      else if (eventName.startsWith('whatsApp') || eventName.startsWith('whatsapp'))
        channel = 'whatsApp';
      else if (eventName.startsWith('hostedUnsubscribe')) channel = 'email';
      else if (eventName === 'journeyExit') channel = undefined;

      // Determine event type for categorization
      let type = eventName
        .replace(/([A-Z])/g, '.$1')
        .toLowerCase()
        .replace(/^\./, '');
      // Normalize: e.g. "emailSend" -> "email.send", "pushBounce" -> "push.bounce"
      if (!type.includes('.')) {
        type = `iterable.${type}`;
      }

      // Build a unique event ID
      let eventId =
        raw.messageId ||
        raw.transactionId ||
        `${eventName}-${ctx.input.email || ctx.input.userId}-${dataFields.createdAt || dataFields.sentAt || Date.now()}`;

      return {
        type,
        id: String(eventId),
        output: {
          eventName,
          email: ctx.input.email,
          userId: ctx.input.userId,
          campaignId: (dataFields.campaignId ?? raw.campaignId) as number | undefined,
          campaignName: (dataFields.campaignName ?? raw.campaignName) as string | undefined,
          templateId: (dataFields.templateId ?? raw.templateId) as number | undefined,
          templateName: (dataFields.templateName ?? raw.templateName) as string | undefined,
          messageId: raw.messageId as string | undefined,
          createdAt: dataFields.createdAt
            ? String(dataFields.createdAt)
            : raw.createdAt
              ? String(raw.createdAt)
              : undefined,
          channel,
          eventFields: dataFields
        }
      };
    }
  })
  .build();
