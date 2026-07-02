import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let inquiryEvents = SlateTrigger.create(spec, {
  name: 'Inquiry Events',
  key: 'inquiry_events',
  description:
    'Receive webhook events for inquiry lifecycle changes including creation, completion, approval, decline, failure, review, and step transitions.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type (e.g., inquiry.created, inquiry.completed, inquiry.approved)'),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().optional().describe('Inquiry ID'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      inquiryId: z.string().optional().describe('Persona inquiry ID'),
      status: z.string().optional().describe('Inquiry status'),
      referenceId: z.string().optional().describe('Your reference ID'),
      accountId: z.string().optional().describe('Associated account ID'),
      templateId: z.string().optional().describe('Inquiry template ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      completedAt: z.string().optional().describe('Completion timestamp'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full inquiry attributes')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PersonaClient({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        enabledEvents: [
          'inquiry.created',
          'inquiry.started',
          'inquiry.expired',
          'inquiry.completed',
          'inquiry.failed',
          'inquiry.marked-for-review',
          'inquiry.approved',
          'inquiry.declined',
          'inquiry.transitioned'
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

      // Only handle inquiry events
      if (!eventType.startsWith('inquiry.')) return { inputs: [] };

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
          inquiryId: payloadData.id || ctx.input.resourceId,
          status: payloadAttrs.status,
          referenceId: payloadAttrs['reference-id'] || payloadAttrs.reference_id,
          accountId: relationships.account?.data?.id,
          templateId:
            relationships['inquiry-template']?.data?.id ||
            relationships.inquiry_template?.data?.id,
          createdAt: payloadAttrs['created-at'] || payloadAttrs.created_at,
          completedAt: payloadAttrs['completed-at'] || payloadAttrs.completed_at,
          attributes: payloadAttrs
        }
      };
    }
  })
  .build();
