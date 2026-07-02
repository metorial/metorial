import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let accountEvents = SlateTrigger.create(spec, {
  name: 'Account Events',
  key: 'account_events',
  description:
    'Receive webhook events for account lifecycle changes including creation, redaction, archiving, restoration, consolidation, and tag changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type (e.g., account.created, account.archived)'),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().optional().describe('Account ID'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      accountId: z.string().optional().describe('Persona account ID'),
      referenceId: z.string().optional().describe('Your reference ID'),
      nameFirst: z.string().optional().describe('First name'),
      nameLast: z.string().optional().describe('Last name'),
      emailAddress: z.string().optional().describe('Email address'),
      tags: z.array(z.string()).optional().describe('Account tags'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full account attributes')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PersonaClient({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        enabledEvents: [
          'account.created',
          'account.redacted',
          'account.archived',
          'account.restored',
          'account.consolidated',
          'account.tag-added',
          'account.tag-removed'
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

      if (!eventType.startsWith('account.')) return { inputs: [] };

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

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          accountId: payloadData.id || ctx.input.resourceId,
          referenceId: payloadAttrs['reference-id'] || payloadAttrs.reference_id,
          nameFirst: payloadAttrs['name-first'] || payloadAttrs.name_first,
          nameLast: payloadAttrs['name-last'] || payloadAttrs.name_last,
          emailAddress: payloadAttrs['email-address'] || payloadAttrs.email_address,
          tags: payloadAttrs.tags,
          createdAt: payloadAttrs['created-at'] || payloadAttrs.created_at,
          attributes: payloadAttrs
        }
      };
    }
  })
  .build();
