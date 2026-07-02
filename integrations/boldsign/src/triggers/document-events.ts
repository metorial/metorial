import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let _documentEventTypes = [
  'Sent',
  'SendFailed',
  'Signed',
  'Completed',
  'Declined',
  'Revoked',
  'Reassigned',
  'Expired',
  'Viewed',
  'Edited',
  'EditFailed',
  'DeliveryFailed',
  'AuthenticationFailed',
  'IdentityVerificationInitiated',
  'IdentityVerificationSucceeded',
  'IdentityVerificationFailed',
  'DraftCreated',
  'Reminder',
  'SignerSaved'
] as const;

export let documentEvents = SlateTrigger.create(spec, {
  name: 'Document Events',
  key: 'document_events',
  description:
    'Triggered when document lifecycle events occur, such as sent, signed, completed, declined, revoked, expired, and more. Covers all document-related webhook events from BoldSign.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID for deduplication'),
      eventType: z.string().describe('Type of document event'),
      created: z.number().describe('Unix timestamp of the event'),
      environment: z.string().optional().describe('Event environment (Live or Test)'),
      documentId: z.string().describe('ID of the affected document'),
      documentTitle: z.string().optional().describe('Title of the document'),
      documentStatus: z.string().optional().describe('Current status of the document'),
      senderName: z.string().optional().describe('Name of the document sender'),
      senderEmail: z.string().optional().describe('Email of the document sender'),
      signerDetails: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Signer details from the event payload'),
      ccDetails: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('CC details from the event payload'),
      actorType: z.string().optional().describe('Type of actor who triggered the event'),
      actorId: z.string().optional().describe('ID of the actor who triggered the event')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the affected document'),
      documentTitle: z.string().optional().describe('Title of the document'),
      documentStatus: z.string().optional().describe('Current status of the document'),
      eventType: z.string().describe('Type of event that occurred'),
      eventTimestamp: z.number().describe('Unix timestamp of the event'),
      environment: z.string().optional().describe('Event environment (Live or Test)'),
      senderName: z.string().optional().describe('Name of the document sender'),
      senderEmail: z.string().optional().describe('Email of the document sender'),
      signerDetails: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Signer details'),
      ccDetails: z.array(z.record(z.string(), z.any())).optional().describe('CC details'),
      actorType: z.string().optional().describe('Type of actor who triggered the event'),
      actorId: z.string().optional().describe('ID of the actor who triggered the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;

      // Handle verification requests from BoldSign
      if (body?.event?.eventType === 'Verification') {
        return { inputs: [] };
      }

      let event = body?.event;
      let data = body?.data;
      let context = body?.context;

      if (!event || !data) {
        return { inputs: [] };
      }

      let eventType = event.eventType as string;

      // Only handle document events, not template events
      let templateEventTypes = [
        'TemplateCreated',
        'TemplateEdited',
        'TemplateCreateFailed',
        'TemplateDraftCreated',
        'TemplateSendFailed',
        'SenderIdentityCreated',
        'SenderIdentityUpdated',
        'SenderIdentityDeleted',
        'SenderIdentityRevoked',
        'SenderIdentityVerified',
        'SenderIdentityDenied'
      ];

      if (templateEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventId: event.id,
            eventType,
            created: event.created,
            environment: event.environment,
            documentId: data.documentId,
            documentTitle: data.messageTitle ?? data.title,
            documentStatus: data.status,
            senderName: data.senderDetail?.name,
            senderEmail: data.senderDetail?.emailAddress,
            signerDetails: data.signerDetails,
            ccDetails: data.ccDetails,
            actorType: context?.actor?.userType,
            actorId: context?.actor?.id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType;

      let typeMap: Record<string, string> = {
        Sent: 'document.sent',
        SendFailed: 'document.send_failed',
        Signed: 'document.signed',
        Completed: 'document.completed',
        Declined: 'document.declined',
        Revoked: 'document.revoked',
        Reassigned: 'document.reassigned',
        Expired: 'document.expired',
        Viewed: 'document.viewed',
        Edited: 'document.edited',
        EditFailed: 'document.edit_failed',
        DeliveryFailed: 'document.delivery_failed',
        AuthenticationFailed: 'document.authentication_failed',
        IdentityVerificationInitiated: 'document.identity_verification_initiated',
        IdentityVerificationSucceeded: 'document.identity_verification_succeeded',
        IdentityVerificationFailed: 'document.identity_verification_failed',
        DraftCreated: 'document.draft_created',
        Reminder: 'document.reminder',
        SignerSaved: 'document.signer_saved'
      };

      return {
        type: typeMap[eventType] ?? `document.${eventType.toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          documentId: ctx.input.documentId,
          documentTitle: ctx.input.documentTitle,
          documentStatus: ctx.input.documentStatus,
          eventType: ctx.input.eventType,
          eventTimestamp: ctx.input.created,
          environment: ctx.input.environment,
          senderName: ctx.input.senderName,
          senderEmail: ctx.input.senderEmail,
          signerDetails: ctx.input.signerDetails,
          ccDetails: ctx.input.ccDetails,
          actorType: ctx.input.actorType,
          actorId: ctx.input.actorId
        }
      };
    }
  })
  .build();
