import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  recipientId: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  routingOrder: z.string().optional(),
  signedDateTime: z.string().optional(),
  deliveredDateTime: z.string().optional(),
  declinedDateTime: z.string().optional(),
  declinedReason: z.string().optional()
});

export let envelopeEvents = SlateTrigger.create(spec, {
  name: 'Envelope Events',
  key: 'envelope_events',
  description:
    'Triggers when DocuSign envelope or recipient status changes. Covers envelope sent, delivered, completed, declined, voided, and recipient-level status changes.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of the event (e.g., envelope-sent, envelope-completed, recipient-signed)'
        ),
      envelopeId: z.string().describe('ID of the affected envelope'),
      eventTimestamp: z.string().describe('Timestamp of the event'),
      payload: z.any().describe('Raw webhook payload from DocuSign')
    })
  )
  .output(
    z.object({
      envelopeId: z.string().describe('ID of the envelope'),
      envelopeStatus: z.string().describe('Current status of the envelope'),
      emailSubject: z.string().optional().describe('Subject line of the envelope email'),
      senderName: z.string().optional().describe('Name of the sender'),
      senderEmail: z.string().optional().describe('Email of the sender'),
      createdDateTime: z.string().optional().describe('When the envelope was created'),
      sentDateTime: z.string().optional().describe('When the envelope was sent'),
      completedDateTime: z.string().optional().describe('When signing was completed'),
      declinedDateTime: z.string().optional().describe('When the envelope was declined'),
      voidedDateTime: z.string().optional().describe('When the envelope was voided'),
      voidedReason: z.string().optional().describe('Reason the envelope was voided'),
      recipients: z
        .array(recipientSchema)
        .optional()
        .describe('Recipient details and statuses')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUri: ctx.auth.baseUri,
        accountId: ctx.auth.accountId
      });

      let result = await client.createConnectConfiguration({
        name: `Slates Webhook - ${Date.now()}`,
        urlToPublishTo: ctx.input.webhookBaseUrl,
        configurationType: 'custom',
        allUsers: 'true',
        allowEnvelopePublish: 'true',
        enableLog: 'true',
        requiresAcknowledgement: 'true',
        envelopeEvents: ['Sent', 'Delivered', 'Completed', 'Declined', 'Voided'],
        recipientEvents: [
          'Sent',
          'Delivered',
          'Completed',
          'Declined',
          'AuthenticationFailed',
          'AutoResponded'
        ],
        eventData: {
          version: 'restv2.1',
          format: 'json',
          includeData: ['recipients', 'tabs', 'custom_fields']
        }
      });

      return {
        registrationDetails: {
          connectId: result.connectId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUri: ctx.auth.baseUri,
        accountId: ctx.auth.accountId
      });

      if (ctx.input.registrationDetails?.connectId) {
        await client.deleteConnectConfiguration(ctx.input.registrationDetails.connectId);
      }
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // DocuSign Connect sends different payload structures.
      // restv2.1 JSON format wraps the envelope data.
      let envelopeId = data?.data?.envelopeId || data?.envelopeId;
      if (!envelopeId) {
        return { inputs: [] };
      }

      let envelopeData = data?.data || data;
      let envelopeStatus =
        envelopeData.envelopeSummary?.status || envelopeData.status || 'unknown';
      let eventTimestamp =
        data?.generatedDateTime || data?.statusChangedDateTime || new Date().toISOString();

      // Determine event types from the payload
      let inputs: Array<{
        eventType: string;
        envelopeId: string;
        eventTimestamp: string;
        payload: any;
      }> = [];

      // Envelope-level event
      let envelopeEventType = `envelope.${envelopeStatus.toLowerCase()}`;
      inputs.push({
        eventType: envelopeEventType,
        envelopeId,
        eventTimestamp,
        payload: envelopeData
      });

      // Check for recipient-level events
      let recipients = envelopeData.envelopeSummary?.recipients || envelopeData.recipients;
      if (recipients) {
        let allRecipients = [
          ...(recipients.signers || []),
          ...(recipients.carbonCopies || []),
          ...(recipients.certifiedDeliveries || [])
        ];

        for (let recipient of allRecipients) {
          if (recipient.status && recipient.recipientId) {
            inputs.push({
              eventType: `recipient.${recipient.status.toLowerCase()}`,
              envelopeId,
              eventTimestamp:
                recipient.signedDateTime ||
                recipient.deliveredDateTime ||
                recipient.sentDateTime ||
                eventTimestamp,
              payload: {
                ...envelopeData,
                triggeredRecipient: recipient
              }
            });
          }
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      let envelopeSummary = payload.envelopeSummary || payload;

      let recipients = envelopeSummary.recipients;
      let mappedRecipients: Array<{
        recipientId?: string;
        email?: string;
        name?: string;
        status?: string;
        routingOrder?: string;
        signedDateTime?: string;
        deliveredDateTime?: string;
        declinedDateTime?: string;
        declinedReason?: string;
      }> = [];

      if (recipients) {
        let allRecipients = [
          ...(recipients.signers || []),
          ...(recipients.carbonCopies || []),
          ...(recipients.certifiedDeliveries || [])
        ];
        mappedRecipients = allRecipients.map((r: any) => ({
          recipientId: r.recipientId,
          email: r.email,
          name: r.name,
          status: r.status,
          routingOrder: r.routingOrder,
          signedDateTime: r.signedDateTime,
          deliveredDateTime: r.deliveredDateTime,
          declinedDateTime: r.declinedDateTime,
          declinedReason: r.declinedReason
        }));
      }

      let sender = envelopeSummary.sender;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.envelopeId}-${ctx.input.eventType}-${ctx.input.eventTimestamp}`,
        output: {
          envelopeId: ctx.input.envelopeId,
          envelopeStatus: envelopeSummary.status || 'unknown',
          emailSubject: envelopeSummary.emailSubject,
          senderName: sender?.userName,
          senderEmail: sender?.email,
          createdDateTime: envelopeSummary.createdDateTime,
          sentDateTime: envelopeSummary.sentDateTime,
          completedDateTime: envelopeSummary.completedDateTime,
          declinedDateTime: envelopeSummary.declinedDateTime,
          voidedDateTime: envelopeSummary.voidedDateTime,
          voidedReason: envelopeSummary.voidedReason,
          recipients: mappedRecipients.length > 0 ? mappedRecipients : undefined
        }
      };
    }
  })
  .build();
