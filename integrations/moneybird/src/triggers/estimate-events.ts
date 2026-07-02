import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let estimateEventTypes = [
  'estimate_created',
  'estimate_updated',
  'estimate_destroyed',
  'estimate_mark_accepted',
  'estimate_mark_rejected',
  'estimate_mark_open',
  'estimate_mark_late',
  'estimate_mark_billed',
  'estimate_mark_archived',
  'estimate_billed',
  'estimate_send_email',
  'estimate_send_manually',
  'estimate_send_post',
  'estimate_accepted_contact',
  'estimate_signed_sender',
  'estimate_state_changed_to_late'
] as const;

export let estimateEvents = SlateTrigger.create(spec, {
  name: 'Estimate Events',
  key: 'estimate_events',
  description:
    'Triggered on estimate (quote) lifecycle events: creation, updates, deletion, state changes (open, accepted, rejected, billed, late, archived), sending, and signing.'
})
  .input(
    z.object({
      eventType: z.string().describe('Moneybird event type'),
      webhookToken: z.string().optional(),
      entity: z.any().describe('Full estimate entity data'),
      state: z.string().optional(),
      administrationId: z.string().optional()
    })
  )
  .output(
    z.object({
      estimateId: z.string().describe('Estimate ID'),
      estimateNumber: z.string().nullable().describe('Human-readable estimate number'),
      contactId: z.string().nullable().describe('Contact ID'),
      estimateState: z.string().nullable().describe('Current estimate state'),
      totalPriceInclTax: z.string().nullable().describe('Total including tax'),
      currency: z.string().nullable().describe('Currency code'),
      estimateDate: z.string().nullable().describe('Estimate date'),
      dueDate: z.string().nullable().describe('Due/expiry date'),
      url: z.string().nullable().describe('Estimate URL')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.config.administrationId
      });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        ...estimateEventTypes
      ]);

      return {
        registrationDetails: {
          webhookId: String(webhook.id),
          token: webhook.token
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.config.administrationId
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.action || 'unknown',
            webhookToken: data.token,
            entity: data.entity,
            state: data.state,
            administrationId: data.administration_id
              ? String(data.administration_id)
              : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let entity = ctx.input.entity || {};
      let idempotencyKey = `${ctx.input.eventType}-${entity.id}-${Date.now()}`;

      return {
        type: ctx.input.eventType.replace(/_/g, '.'),
        id: idempotencyKey,
        output: {
          estimateId: entity.id ? String(entity.id) : 'unknown',
          estimateNumber: entity.estimate_id || null,
          contactId: entity.contact_id ? String(entity.contact_id) : null,
          estimateState: ctx.input.state || entity.state || null,
          totalPriceInclTax: entity.total_price_incl_tax || null,
          currency: entity.currency || null,
          estimateDate: entity.estimate_date || null,
          dueDate: entity.due_date || null,
          url: entity.url || null
        }
      };
    }
  });
