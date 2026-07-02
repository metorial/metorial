import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let verificationEvents = SlateTrigger.create(spec, {
  name: 'Verification Events',
  key: 'verification_events',
  description:
    'Receive webhook events for verification lifecycle changes including creation, submission, pass, fail, retry requests, and cancellation.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Event type (e.g., verification.created, verification.passed, verification.failed)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().optional().describe('Verification ID'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      verificationId: z.string().optional().describe('Persona verification ID'),
      verificationType: z
        .string()
        .optional()
        .describe('Verification type (e.g., verification/government-id, verification/selfie)'),
      status: z.string().optional().describe('Verification status'),
      inquiryId: z.string().optional().describe('Associated inquiry ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      completedAt: z.string().optional().describe('Completion timestamp'),
      checks: z.array(z.any()).optional().describe('Verification check results'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full verification attributes')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PersonaClient({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        enabledEvents: [
          'verification.created',
          'verification.submitted',
          'verification.passed',
          'verification.failed',
          'verification.requires-retry',
          'verification.canceled'
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

      if (!eventType.startsWith('verification.')) return { inputs: [] };

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
          verificationId: payloadData.id || ctx.input.resourceId,
          verificationType: payloadData.type,
          status: payloadAttrs.status,
          inquiryId: relationships.inquiry?.data?.id,
          createdAt: payloadAttrs['created-at'] || payloadAttrs.created_at,
          completedAt: payloadAttrs['completed-at'] || payloadAttrs.completed_at,
          checks: payloadAttrs.checks,
          attributes: payloadAttrs
        }
      };
    }
  })
  .build();
