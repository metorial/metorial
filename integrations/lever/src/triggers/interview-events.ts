import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let interviewEventsTrigger = SlateTrigger.create(spec, {
  name: 'Interview Events',
  key: 'interview_events',
  description:
    'Triggers when an interview is created, updated, or deleted in Lever. Includes interview, panel, and opportunity details.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of interview event'),
      triggeredAt: z.string().describe('When the event occurred (ISO 8601)'),
      interviewId: z.string().describe('Interview ID'),
      panelId: z.string().optional().describe('Panel ID'),
      opportunityId: z.string().optional().describe('Opportunity ID'),
      rawEvent: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      interviewId: z.string().describe('ID of the affected interview'),
      panelId: z.string().optional().describe('ID of the interview panel'),
      opportunityId: z.string().optional().describe('ID of the related opportunity'),
      eventTimestamp: z.string().optional().describe('Timestamp of the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

      let eventTypes = ['interviewCreated', 'interviewUpdated', 'interviewDeleted'];

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

      let eventData = body?.data || {};

      return {
        inputs: [
          {
            eventType: eventSuffix,
            triggeredAt: body?.triggeredAt
              ? new Date(body.triggeredAt).toISOString()
              : new Date().toISOString(),
            interviewId: eventData.interviewId || eventData.id || '',
            panelId: eventData.panelId,
            opportunityId: eventData.opportunityId,
            rawEvent: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        interviewCreated: 'interview.created',
        interviewUpdated: 'interview.updated',
        interviewDeleted: 'interview.deleted'
      };

      return {
        type: typeMap[ctx.input.eventType] || `interview.${ctx.input.eventType}`,
        id: `${ctx.input.eventType}_${ctx.input.interviewId}_${ctx.input.triggeredAt}`,
        output: {
          interviewId: ctx.input.interviewId,
          panelId: ctx.input.panelId,
          opportunityId: ctx.input.opportunityId,
          eventTimestamp: ctx.input.triggeredAt
        }
      };
    }
  })
  .build();
