import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let opportunityEventsTrigger = SlateTrigger.create(spec, {
  name: 'Opportunity Events',
  key: 'opportunity_events',
  description:
    'Triggers when an opportunity is created (application), hired, stage changed, archived/unarchived, or deleted in Lever.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of opportunity event'),
      triggeredAt: z.string().describe('When the event occurred (ISO 8601)'),
      opportunityId: z.string().describe('Opportunity ID'),
      contactId: z.string().optional().describe('Contact ID'),
      rawEvent: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      opportunityId: z.string().describe('ID of the affected opportunity'),
      contactId: z.string().optional().describe('ID of the candidate contact'),
      fromStageId: z.string().optional().describe('Previous stage ID (for stage changes)'),
      toStageId: z.string().optional().describe('New stage ID (for stage changes)'),
      archiveReason: z.string().optional().describe('Archive reason ID (for archive events)'),
      isArchived: z.boolean().optional().describe('Whether the opportunity is now archived'),
      applicationId: z
        .string()
        .optional()
        .describe('Application ID (for application created events)'),
      origin: z.string().optional().describe('Opportunity origin'),
      deletedByUserId: z.string().optional().describe('User who deleted the candidate')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

      let eventTypes = [
        'applicationCreated',
        'candidateHired',
        'candidateStageChange',
        'candidateArchiveChange',
        'candidateDeleted'
      ];

      let registrations: Array<{ webhookId: string; event: string }> = [];

      for (let event of eventTypes) {
        let result = await client.createWebhook({
          url: `${ctx.input.webhookBaseUrl}/${event}`,
          event: event
        });
        registrations.push({
          webhookId: result.data.id,
          event: event
        });
      }

      return {
        registrationDetails: { webhooks: registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });
      let webhooks = ctx.input.registrationDetails?.webhooks || [];

      for (let wh of webhooks) {
        try {
          await client.deleteWebhook(wh.webhookId);
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let eventSuffix = pathParts[pathParts.length - 1] || 'unknown';

      let eventType = eventSuffix;
      let opportunityId = body?.data?.opportunityId || body?.data?.id || '';
      let contactId = body?.data?.contactId;
      let triggeredAt = body?.triggeredAt
        ? new Date(body.triggeredAt).toISOString()
        : new Date().toISOString();

      return {
        inputs: [
          {
            eventType,
            triggeredAt,
            opportunityId,
            contactId,
            rawEvent: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let event = ctx.input.rawEvent;
      let eventData = event?.data || {};

      let output: Record<string, any> = {
        opportunityId: ctx.input.opportunityId,
        contactId: ctx.input.contactId
      };

      let eventType = ctx.input.eventType;

      if (eventType === 'applicationCreated') {
        output.applicationId = eventData.applicationId;
        output.origin = eventData.origin;
      } else if (eventType === 'candidateStageChange') {
        output.fromStageId = eventData.fromStageId;
        output.toStageId = eventData.toStageId;
      } else if (eventType === 'candidateArchiveChange') {
        output.isArchived = !!eventData.toArchived?.archivedAt;
        output.archiveReason = eventData.toArchived?.reason;
      } else if (eventType === 'candidateDeleted') {
        output.deletedByUserId = eventData.deletedBy;
      }

      let typeMap: Record<string, string> = {
        applicationCreated: 'opportunity.application_created',
        candidateHired: 'opportunity.hired',
        candidateStageChange: 'opportunity.stage_changed',
        candidateArchiveChange: 'opportunity.archive_changed',
        candidateDeleted: 'opportunity.deleted'
      };

      return {
        type: typeMap[eventType] || `opportunity.${eventType}`,
        id: `${eventType}_${ctx.input.opportunityId}_${ctx.input.triggeredAt}`,
        output: output as any
      };
    }
  })
  .build();
