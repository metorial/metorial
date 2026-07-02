import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let reportEvents = SlateTrigger.create(spec, {
  name: 'Report Events',
  key: 'report_events',
  description:
    'Receive webhook events when reports complete processing (ready), encounter errors, or produce matches. Covers all report types: address lookup, adverse media, watchlist, PEP, email, phone, and profile.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type (e.g., report/watchlist.ready, report/adverse-media.matched)'),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().optional().describe('Report ID'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      reportId: z.string().optional().describe('Persona report ID'),
      reportType: z
        .string()
        .optional()
        .describe('Report type (e.g., report/watchlist, report/adverse-media)'),
      status: z.string().optional().describe('Report status'),
      hasMatch: z.boolean().optional().describe('Whether the report found matches'),
      accountId: z.string().optional().describe('Associated account ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      completedAt: z.string().optional().describe('Completion timestamp'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full report attributes')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PersonaClient({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        enabledEvents: [
          'report/address-lookup.ready',
          'report/address-lookup.errored',
          'report/address-lookup.matched',
          'report/adverse-media.ready',
          'report/adverse-media.errored',
          'report/adverse-media.matched',
          'report/business-adverse-media.ready',
          'report/business-adverse-media.errored',
          'report/business-adverse-media.matched',
          'report/watchlist.ready',
          'report/watchlist.errored',
          'report/watchlist.matched',
          'report/business-watchlist.ready',
          'report/business-watchlist.errored',
          'report/business-watchlist.matched',
          'report/politically-exposed-person.ready',
          'report/politically-exposed-person.errored',
          'report/politically-exposed-person.matched',
          'report/email-address.ready',
          'report/email-address.errored',
          'report/email-address.matched',
          'report/phone-number.ready',
          'report/phone-number.errored',
          'report/phone-number.matched',
          'report/profile.ready',
          'report/profile.errored',
          'report/profile.matched'
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

      if (!eventType.startsWith('report/')) return { inputs: [] };

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
          reportId: payloadData.id || ctx.input.resourceId,
          reportType: payloadData.type,
          status: payloadAttrs.status,
          hasMatch: payloadAttrs['has-match'] ?? payloadAttrs.has_match,
          accountId: relationships.account?.data?.id,
          createdAt: payloadAttrs['created-at'] || payloadAttrs.created_at,
          completedAt: payloadAttrs['completed-at'] || payloadAttrs.completed_at,
          attributes: payloadAttrs
        }
      };
    }
  })
  .build();
