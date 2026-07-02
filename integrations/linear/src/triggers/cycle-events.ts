import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { linearServiceError } from '../lib/errors';
import { spec } from '../spec';

export let cycleEventsTrigger = SlateTrigger.create(spec, {
  name: 'Cycle Events',
  key: 'cycle_events',
  description: 'Triggers when cycles (sprints) are created, updated, or removed in Linear.'
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'remove']).describe('The action that occurred'),
      webhookId: z.string().describe('Delivery ID from the webhook'),
      cycleId: z.string().describe('Cycle ID'),
      cycleData: z.any().describe('Full cycle data from webhook payload'),
      updatedFrom: z.any().optional().describe('Previous values for updated fields')
    })
  )
  .output(
    z.object({
      cycleId: z.string().describe('Cycle ID'),
      name: z.string().nullable().describe('Cycle name'),
      number: z.number().nullable().describe('Cycle number'),
      startsAt: z.string().nullable().describe('Start date'),
      endsAt: z.string().nullable().describe('End date'),
      completedAt: z.string().nullable().describe('Completion date'),
      progress: z.number().nullable().describe('Cycle progress (0-1)'),
      teamId: z.string().nullable().describe('Team ID'),
      createdAt: z.string().nullable(),
      updatedAt: z.string().nullable(),
      previousValues: z.any().nullable().describe('Previous field values (on update)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new LinearClient(ctx.auth.token);
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        resourceTypes: ['Cycle'],
        allPublicTeams: true
      });

      if (!result.success) {
        throw linearServiceError('Failed to register webhook');
      }

      return {
        registrationDetails: {
          webhookId: result.webhook.id,
          secret: result.webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new LinearClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let deliveryId = ctx.request.headers.get('Linear-Delivery') || body.webhookId || '';
      let eventType = ctx.request.headers.get('Linear-Event') || '';

      if (eventType !== 'Cycle' && body.type !== 'Cycle') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            action: body.action,
            webhookId: deliveryId,
            cycleId: body.data?.id || '',
            cycleData: body.data,
            updatedFrom: body.updatedFrom
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.cycleData || {};

      return {
        type: `cycle.${ctx.input.action}`,
        id: ctx.input.webhookId,
        output: {
          cycleId: data.id || ctx.input.cycleId,
          name: data.name || null,
          number: data.number ?? null,
          startsAt: data.startsAt || null,
          endsAt: data.endsAt || null,
          completedAt: data.completedAt || null,
          progress: data.progress ?? null,
          teamId: data.teamId || data.team?.id || null,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
          previousValues: ctx.input.updatedFrom || null
        }
      };
    }
  })
  .build();
