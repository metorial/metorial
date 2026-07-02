import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let outboundEvents = SlateTrigger.create(spec, {
  name: 'Outbound Email Events',
  key: 'outbound_events',
  description:
    'Triggers on outbound email events including bounces, deliveries, opens, clicks, spam complaints, and subscription changes. Postmark will POST event data to this webhook when any configured event occurs.'
})
  .input(
    z.object({
      recordType: z
        .string()
        .describe(
          'Event type: Bounce, Delivery, Open, Click, SpamComplaint, or SubscriptionChange.'
        ),
      messageId: z.string().describe('Postmark message ID.'),
      recipient: z.string().describe('Recipient email address.'),
      tag: z.string().optional().describe('Tag associated with the email.'),
      messageStream: z.string().optional().describe('Message stream ID.'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata from the original email.'),
      bouncedAt: z.string().optional().describe('Bounce timestamp (for bounce events).'),
      bounceType: z.string().optional().describe('Bounce classification type.'),
      bounceTypeCode: z.number().optional().describe('Bounce type code.'),
      bounceName: z.string().optional().describe('Bounce type name.'),
      bounceDescription: z.string().optional().describe('Bounce description.'),
      bounceId: z.number().optional().describe('Bounce record ID.'),
      inactive: z.boolean().optional().describe('Whether the address was deactivated.'),
      canActivate: z.boolean().optional().describe('Whether the address can be reactivated.'),
      deliveredAt: z.string().optional().describe('Delivery timestamp.'),
      deliveryDetails: z
        .string()
        .optional()
        .describe('Delivery details from receiving server.'),
      receivedAt: z.string().optional().describe('Timestamp of open/click event.'),
      firstOpen: z.boolean().optional().describe('Whether this was the first open.'),
      clientName: z.string().optional().describe('Email client name.'),
      clientCompany: z.string().optional().describe('Email client company.'),
      osName: z.string().optional().describe('Operating system name.'),
      platform: z
        .string()
        .optional()
        .describe('Platform type (Desktop, Mobile, WebMail, etc.).'),
      originalLink: z
        .string()
        .optional()
        .describe('Original tracked link URL (for click events).'),
      clickLocation: z
        .string()
        .optional()
        .describe('Where the link was clicked (HTML or Text).'),
      suppressSending: z
        .boolean()
        .optional()
        .describe('Whether sending is suppressed (for subscription changes).'),
      suppressionReason: z
        .string()
        .optional()
        .describe('Suppression reason (for subscription changes).'),
      origin: z.string().optional().describe('Change origin (for subscription changes).'),
      changedAt: z
        .string()
        .optional()
        .describe('Change timestamp (for subscription changes).'),
      from: z.string().optional().describe('Sender email address.'),
      subject: z.string().optional().describe('Email subject.'),
      serverId: z.number().optional().describe('Server ID.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Postmark message ID.'),
      recipient: z.string().describe('Recipient email address.'),
      tag: z.string().optional().describe('Associated tag.'),
      messageStream: z.string().optional().describe('Message stream ID.'),
      metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata.'),
      from: z.string().optional().describe('Sender address.'),
      subject: z.string().optional().describe('Email subject.'),
      bounceType: z.string().optional().describe('Bounce type (for bounce events).'),
      bounceName: z.string().optional().describe('Bounce type name.'),
      bounceDescription: z.string().optional().describe('Bounce description.'),
      bounceId: z.number().optional().describe('Bounce record ID.'),
      inactive: z.boolean().optional().describe('Whether address is inactive.'),
      canActivate: z.boolean().optional().describe('Whether the address can be reactivated.'),
      deliveredAt: z.string().optional().describe('Delivery timestamp.'),
      deliveryDetails: z.string().optional().describe('Delivery details.'),
      firstOpen: z.boolean().optional().describe('Whether first open.'),
      clientName: z.string().optional().describe('Email client name.'),
      osName: z.string().optional().describe('OS name.'),
      platform: z.string().optional().describe('Platform type.'),
      originalLink: z.string().optional().describe('Clicked link URL.'),
      clickLocation: z.string().optional().describe('Click location.'),
      suppressSending: z.boolean().optional().describe('Suppression status.'),
      suppressionReason: z.string().optional().describe('Suppression reason.'),
      eventTimestamp: z.string().optional().describe('Event timestamp.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountToken: ctx.auth.accountToken
      });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        triggers: {
          open: { enabled: true, postFirstOpenOnly: false },
          click: { enabled: true },
          delivery: { enabled: true },
          bounce: { enabled: true, includeContent: false },
          spamComplaint: { enabled: true, includeContent: false },
          subscriptionChange: { enabled: true }
        }
      });

      return {
        registrationDetails: {
          webhookId: webhook.ID
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountToken: ctx.auth.accountToken
      });

      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let recordType = data.RecordType as string;

      let baseInput = {
        recordType,
        messageId: data.MessageID || '',
        tag: data.Tag || undefined,
        messageStream: data.MessageStream || undefined,
        metadata: data.Metadata || undefined,
        from: data.From || undefined,
        subject: data.Subject || undefined,
        serverId: data.ServerID || undefined
      };

      if (recordType === 'Bounce') {
        return {
          inputs: [
            {
              ...baseInput,
              recipient: data.Email || '',
              bouncedAt: data.BouncedAt || undefined,
              bounceType: data.Type || undefined,
              bounceTypeCode: data.TypeCode || undefined,
              bounceName: data.Name || undefined,
              bounceDescription: data.Description || undefined,
              bounceId: data.ID || undefined,
              inactive: data.Inactive ?? undefined,
              canActivate: data.CanActivate ?? undefined
            }
          ]
        };
      }

      if (recordType === 'Delivery') {
        return {
          inputs: [
            {
              ...baseInput,
              recipient: data.Recipient || '',
              deliveredAt: data.DeliveredAt || undefined,
              deliveryDetails: data.Details || undefined
            }
          ]
        };
      }

      if (recordType === 'Open') {
        return {
          inputs: [
            {
              ...baseInput,
              recipient: data.Recipient || '',
              receivedAt: data.ReceivedAt || undefined,
              firstOpen: data.FirstOpen ?? undefined,
              clientName: data.Client?.Name || undefined,
              clientCompany: data.Client?.Company || undefined,
              osName: data.OS?.Name || undefined,
              platform: data.Platform || undefined
            }
          ]
        };
      }

      if (recordType === 'Click') {
        return {
          inputs: [
            {
              ...baseInput,
              recipient: data.Recipient || '',
              receivedAt: data.ReceivedAt || undefined,
              originalLink: data.OriginalLink || undefined,
              clickLocation: data.ClickLocation || undefined,
              clientName: data.Client?.Name || undefined,
              clientCompany: data.Client?.Company || undefined,
              osName: data.OS?.Name || undefined,
              platform: data.Platform || undefined
            }
          ]
        };
      }

      if (recordType === 'SpamComplaint') {
        return {
          inputs: [
            {
              ...baseInput,
              recipient: data.Email || '',
              bouncedAt: data.BouncedAt || undefined,
              bounceType: data.Type || undefined,
              bounceTypeCode: data.TypeCode || undefined,
              bounceName: data.Name || undefined,
              inactive: data.Inactive ?? undefined,
              canActivate: data.CanActivate ?? undefined
            }
          ]
        };
      }

      if (recordType === 'SubscriptionChange') {
        return {
          inputs: [
            {
              ...baseInput,
              recipient: data.Recipient || '',
              suppressSending: data.SuppressSending ?? undefined,
              suppressionReason: data.SuppressionReason || undefined,
              origin: data.Origin || undefined,
              changedAt: data.ChangedAt || undefined
            }
          ]
        };
      }

      return {
        inputs: [
          {
            ...baseInput,
            recipient: data.Recipient || data.Email || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let recordType = ctx.input.recordType;

      let typeMap: Record<string, string> = {
        Bounce: 'email.bounced',
        Delivery: 'email.delivered',
        Open: 'email.opened',
        Click: 'email.clicked',
        SpamComplaint: 'email.spam_complaint',
        SubscriptionChange: 'email.subscription_changed'
      };

      let eventType = typeMap[recordType] || `email.${recordType.toLowerCase()}`;
      let eventTimestamp =
        ctx.input.bouncedAt ||
        ctx.input.deliveredAt ||
        ctx.input.receivedAt ||
        ctx.input.changedAt;

      let eventId = `${ctx.input.messageId}-${recordType}`;
      if (ctx.input.originalLink) {
        eventId += `-${ctx.input.originalLink}`;
      }
      if (ctx.input.recipient) {
        eventId += `-${ctx.input.recipient}`;
      }

      return {
        type: eventType,
        id: eventId,
        output: {
          messageId: ctx.input.messageId,
          recipient: ctx.input.recipient,
          tag: ctx.input.tag,
          messageStream: ctx.input.messageStream,
          metadata: ctx.input.metadata,
          from: ctx.input.from,
          subject: ctx.input.subject,
          bounceType: ctx.input.bounceType,
          bounceName: ctx.input.bounceName,
          bounceDescription: ctx.input.bounceDescription,
          bounceId: ctx.input.bounceId,
          inactive: ctx.input.inactive,
          canActivate: ctx.input.canActivate,
          deliveredAt: ctx.input.deliveredAt,
          deliveryDetails: ctx.input.deliveryDetails,
          firstOpen: ctx.input.firstOpen,
          clientName: ctx.input.clientName,
          osName: ctx.input.osName,
          platform: ctx.input.platform,
          originalLink: ctx.input.originalLink,
          clickLocation: ctx.input.clickLocation,
          suppressSending: ctx.input.suppressSending,
          suppressionReason: ctx.input.suppressionReason,
          eventTimestamp
        }
      };
    }
  });
