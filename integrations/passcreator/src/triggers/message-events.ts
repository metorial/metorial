import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let MESSAGE_EVENT_TYPES = ['message_sent', 'message_failed'] as const;

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Triggers when an email or SMS message is sent, delivered, or fails (bounced, skipped, spam, unsubscribed).'
})
  .input(
    z.object({
      eventType: z.enum(MESSAGE_EVENT_TYPES).describe('Type of message event'),
      messageId: z.string().describe('Unique identifier of the message'),
      channel: z.string().optional().describe('Delivery channel (email or sms)'),
      recipient: z.string().optional().describe('Recipient address or phone number'),
      status: z
        .string()
        .optional()
        .describe('Message status (sent, delivered, skipped, bounced, spam, unsubscribed)'),
      subject: z.string().optional().describe('Email subject line'),
      passInstanceId: z.string().optional().describe('Associated pass identifier'),
      templateId: z.string().optional().describe('Associated template identifier'),
      createdOn: z.string().optional().describe('Message creation timestamp'),
      submittedOn: z.string().optional().describe('Message submission timestamp'),
      statusDetails: z
        .object({
          reason: z.string().optional(),
          error: z.string().optional(),
          errorRelatedTo: z.string().optional()
        })
        .optional()
        .describe('Additional status details for failed messages')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message identifier'),
      channel: z.string().optional().describe('Delivery channel'),
      recipient: z.string().optional().describe('Recipient'),
      status: z.string().optional().describe('Delivery status'),
      subject: z.string().optional().describe('Email subject'),
      passInstanceId: z.string().optional().describe('Associated pass ID'),
      templateId: z.string().optional().describe('Associated template ID'),
      createdOn: z.string().optional().describe('Creation timestamp'),
      submittedOn: z.string().optional().describe('Submission timestamp'),
      statusDetails: z
        .object({
          reason: z.string().optional(),
          error: z.string().optional(),
          errorRelatedTo: z.string().optional()
        })
        .optional()
        .describe('Failure details')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let registeredUrls: Array<{ event: string; targetUrl: string }> = [];

      for (let event of MESSAGE_EVENT_TYPES) {
        let targetUrl = `${ctx.input.webhookBaseUrl}/${event}`;
        await client.subscribeWebhook(event, targetUrl, { retryEnabled: true });
        registeredUrls.push({ event, targetUrl });
      }

      return {
        registrationDetails: { registeredUrls }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registeredUrls: Array<{ event: string; targetUrl: string }>;
      };

      for (let entry of details.registeredUrls) {
        try {
          await client.unsubscribeWebhook(entry.targetUrl);
        } catch {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let eventType = pathParts[pathParts.length - 1] as (typeof MESSAGE_EVENT_TYPES)[number];

      if (!MESSAGE_EVENT_TYPES.includes(eventType)) {
        eventType = 'message_sent';
      }

      return {
        inputs: [
          {
            eventType,
            messageId: body.messageId || '',
            channel: body.channel,
            recipient: body.recipient,
            status: body.status,
            subject: body.subject,
            passInstanceId: body.passInstanceId || undefined,
            templateId: body.templateId || undefined,
            createdOn: body.createdOn,
            submittedOn: body.submittedOn || undefined,
            statusDetails: body.statusDetails
              ? {
                  reason: body.statusDetails.reason,
                  error: body.statusDetails.error,
                  errorRelatedTo: body.statusDetails.error_related_to
                }
              : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `message.${ctx.input.eventType === 'message_sent' ? 'sent' : 'failed'}`,
        id: `${ctx.input.messageId}-${ctx.input.eventType}`,
        output: {
          messageId: ctx.input.messageId,
          channel: ctx.input.channel,
          recipient: ctx.input.recipient,
          status: ctx.input.status,
          subject: ctx.input.subject,
          passInstanceId: ctx.input.passInstanceId,
          templateId: ctx.input.templateId,
          createdOn: ctx.input.createdOn,
          submittedOn: ctx.input.submittedOn,
          statusDetails: ctx.input.statusDetails
        }
      };
    }
  })
  .build();
