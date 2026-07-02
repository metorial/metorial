import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let caseEvents = SlateTrigger.create(spec, {
  name: 'Case Events',
  key: 'case_events',
  description:
    'Receive webhook events for case lifecycle changes including creation, assignment, resolution, reopening, and updates.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type (e.g., case.created, case.assigned, case.resolved)'),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().optional().describe('Case ID'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      caseId: z.string().optional().describe('Persona case ID'),
      caseName: z.string().optional().describe('Case name'),
      status: z.string().optional().describe('Case status'),
      assigneeId: z.string().optional().describe('Assigned reviewer ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      resolvedAt: z.string().optional().describe('Resolution timestamp'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full case attributes')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PersonaClient({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        enabledEvents: [
          'case.created',
          'case.assigned',
          'case.resolved',
          'case.reopened',
          'case.updated'
        ]
      });

      return {
        registrationDetails: {
          webhookId: result.data?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PersonaClient({ token: ctx.auth.token });
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (e: any) {
          if (e?.response?.status !== 404) throw e;
        }
      }
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.data) return { inputs: [] };

      let eventData = data.data;
      let n = normalizeResource(eventData);
      let eventType = n.name || n.event_type || 'unknown';

      if (!eventType.startsWith('case.')) return { inputs: [] };

      let payloadData = n.payload?.data || {};

      return {
        inputs: [
          {
            eventType,
            eventId: eventData.id || `${eventType}_${payloadData.id}_${Date.now()}`,
            resourceId: payloadData.id,
            payload: n.payload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payloadData = ctx.input.payload?.data || {};
      let payloadAttrs = payloadData.attributes || {};
      let relationships = payloadData.relationships || {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          caseId: payloadData.id || ctx.input.resourceId,
          caseName: payloadAttrs.name,
          status: payloadAttrs.status,
          assigneeId: relationships.assignee?.data?.id,
          createdAt: payloadAttrs['created-at'] || payloadAttrs.created_at,
          resolvedAt: payloadAttrs['resolved-at'] || payloadAttrs.resolved_at,
          attributes: payloadAttrs
        }
      };
    }
  })
  .build();
