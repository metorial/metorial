import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let agreementEvents = SlateTrigger.create(spec, {
  name: 'Agreement Events',
  key: 'agreement_events',
  description:
    'Receive real-time notifications for agreement lifecycle events including creation, signing, completion, cancellation, delegation, and more.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The webhook event type (e.g., AGREEMENT_CREATED, AGREEMENT_WORKFLOW_COMPLETED)'
        ),
      eventId: z.string().describe('Unique identifier for this webhook notification'),
      agreementId: z.string().describe('ID of the affected agreement'),
      agreementName: z.string().optional().describe('Name of the affected agreement'),
      participantEmail: z
        .string()
        .optional()
        .describe('Email of the participant who triggered the event'),
      participantRole: z.string().optional().describe('Role of the participant'),
      actionType: z
        .string()
        .optional()
        .describe('Type of action completed (for action events)'),
      eventDate: z.string().optional().describe('Timestamp of the event'),
      actingUserEmail: z
        .string()
        .optional()
        .describe('Email of the user who performed the action'),
      status: z.string().optional().describe('Agreement status after the event')
    })
  )
  .output(
    z.object({
      agreementId: z.string().describe('ID of the affected agreement'),
      agreementName: z.string().optional().describe('Name of the agreement'),
      status: z.string().optional().describe('Current status of the agreement'),
      participantEmail: z.string().optional().describe('Email of the participant involved'),
      participantRole: z.string().optional().describe('Role of the participant'),
      actionType: z.string().optional().describe('Type of action completed'),
      eventDate: z.string().optional().describe('When the event occurred'),
      actingUserEmail: z.string().optional().describe('Email of the acting user'),
      senderEmail: z.string().optional().describe('Email of the agreement sender')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiBaseUrl: ctx.auth.apiBaseUrl,
        shard: ctx.auth.shard
      });

      let result = await client.createWebhook({
        name: 'Slates Agreement Events',
        scope: 'ACCOUNT',
        webhookSubscriptionEvents: ['AGREEMENT_ALL'],
        webhookUrlInfo: { url: ctx.input.webhookBaseUrl },
        webhookConditionalParams: {
          webhookAgreementEvents: {
            includeDetailedInfo: true,
            includeParticipantsInfo: true,
            includeDocumentsInfo: false,
            includeSignedDocuments: false
          }
        }
      });

      return {
        registrationDetails: {
          webhookId: result.webhookId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiBaseUrl: ctx.auth.apiBaseUrl,
        shard: ctx.auth.shard
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      // Handle verification GET request from Adobe Sign
      if (ctx.request.method === 'GET') {
        let clientId = ctx.request.headers.get('X-AdobeSign-ClientId') || '';
        return {
          inputs: [],
          response: new Response(JSON.stringify({ xAdobeSignClientId: clientId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        };
      }

      let data = (await ctx.request.json()) as any;

      // Echo back client ID in POST responses too
      let clientId = ctx.request.headers.get('X-AdobeSign-ClientId') || '';

      // Only process agreement events
      if (!data.event?.startsWith('AGREEMENT_')) {
        return {
          inputs: [],
          response: new Response(JSON.stringify({ xAdobeSignClientId: clientId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        };
      }

      let agreement = data.agreement || {};

      return {
        inputs: [
          {
            eventType: data.event,
            eventId:
              data.webhookNotificationId ||
              `${data.event}_${agreement.id || ''}_${data.eventDate || Date.now()}`,
            agreementId: agreement.id || data.eventResourceId || '',
            agreementName: agreement.name,
            participantEmail: data.participantUserEmail,
            participantRole: data.participantRole,
            actionType: data.actionType,
            eventDate: data.eventDate,
            actingUserEmail: data.actingUserEmail,
            status: agreement.status
          }
        ],
        response: new Response(JSON.stringify({ xAdobeSignClientId: clientId }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      };
    },

    handleEvent: async ctx => {
      let eventSuffix = ctx.input.eventType.replace('AGREEMENT_', '').toLowerCase();

      return {
        type: `agreement.${eventSuffix}`,
        id: ctx.input.eventId,
        output: {
          agreementId: ctx.input.agreementId,
          agreementName: ctx.input.agreementName,
          status: ctx.input.status,
          participantEmail: ctx.input.participantEmail,
          participantRole: ctx.input.participantRole,
          actionType: ctx.input.actionType,
          eventDate: ctx.input.eventDate,
          actingUserEmail: ctx.input.actingUserEmail
        }
      };
    }
  });
