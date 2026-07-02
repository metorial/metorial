import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let EVENT_TYPES = ['cadence_created', 'cadence_updated', 'cadence_deleted'] as const;

export let cadenceEvents = SlateTrigger.create(spec, {
  name: 'Cadence Events',
  key: 'cadence_events',
  description: 'Triggers when a cadence is created, updated, or deleted in SalesLoft.'
})
  .input(
    z.object({
      eventType: z.enum(EVENT_TYPES).describe('Type of cadence event'),
      eventId: z.string().describe('Unique event identifier'),
      cadence: z.any().describe('Cadence data from webhook payload')
    })
  )
  .output(
    z.object({
      cadenceId: z.number().describe('SalesLoft cadence ID'),
      name: z.string().nullable().optional().describe('Cadence name'),
      cadenceState: z.string().nullable().optional().describe('Cadence state'),
      teamCadence: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether this is a team cadence'),
      shared: z.boolean().nullable().optional().describe('Whether cadence is shared'),
      draft: z.boolean().nullable().optional().describe('Whether cadence is a draft'),
      ownerId: z.number().nullable().optional().describe('Owner user ID'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations: Array<{ subscriptionId: number; eventType: string }> = [];

      for (let eventType of EVENT_TYPES) {
        let subscription = await client.createWebhookSubscription(
          ctx.input.webhookBaseUrl,
          eventType
        );
        registrations.push({
          subscriptionId: subscription.id,
          eventType
        });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registrations: Array<{ subscriptionId: number }>;
      };

      for (let reg of details.registrations) {
        try {
          await client.deleteWebhookSubscription(reg.subscriptionId);
        } catch (_e) {
          // Subscription may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = ctx.request.headers.get('x-salesloft-event') || 'cadence_updated';

      return {
        inputs: [
          {
            eventType: eventType as (typeof EVENT_TYPES)[number],
            eventId: `${eventType}_${body?.id || Date.now()}`,
            cadence: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.cadence;

      return {
        type: `cadence.${ctx.input.eventType.replace('cadence_', '')}`,
        id: ctx.input.eventId,
        output: {
          cadenceId: raw.id,
          name: raw.name,
          cadenceState: raw.cadence_state,
          teamCadence: raw.team_cadence,
          shared: raw.shared,
          draft: raw.draft,
          ownerId: raw.owner?.id ?? null,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at
        }
      };
    }
  })
  .build();
