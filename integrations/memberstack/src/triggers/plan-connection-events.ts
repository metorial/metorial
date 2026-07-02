import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let planConnectionEvents = SlateTrigger.create(spec, {
  name: 'Plan Connection Events',
  key: 'plan_connection_events',
  description:
    "Triggers when a member's plan connection is created, updated, or canceled. Configure the webhook URL in the Memberstack dashboard under Dev Tools."
})
  .input(
    z.object({
      eventType: z
        .enum([
          'member.planConnection.created',
          'member.planConnection.updated',
          'member.planConnection.canceled'
        ])
        .describe('Type of plan connection event'),
      timestamp: z.number().describe('Event timestamp in milliseconds'),
      memberId: z.string().describe('ID of the affected member'),
      planConnectionId: z.string().optional().describe('ID of the plan connection'),
      active: z.boolean().optional().describe('Whether the plan connection is active'),
      status: z.string().optional().describe('Plan connection status'),
      planType: z.string().optional().describe('Plan type (FREE, SUBSCRIPTION, ONE_TIME)'),
      planId: z.string().optional().describe('ID of the associated plan')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('ID of the affected member'),
      planConnectionId: z.string().optional().describe('ID of the plan connection'),
      active: z.boolean().optional().describe('Whether the plan connection is active'),
      status: z.string().optional().describe('Plan connection status'),
      planType: z.string().optional().describe('Plan type (FREE, SUBSCRIPTION, ONE_TIME)'),
      planId: z.string().optional().describe('ID of the associated plan'),
      timestamp: z.number().describe('Event timestamp in milliseconds')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = data.event as string;
      let payload = data.payload ?? {};

      let validEvents = [
        'member.planConnection.created',
        'member.planConnection.updated',
        'member.planConnection.canceled'
      ];
      if (!validEvents.includes(event)) {
        return { inputs: [] };
      }

      let planConnection = payload.planConnection ?? {};

      return {
        inputs: [
          {
            eventType: event as
              | 'member.planConnection.created'
              | 'member.planConnection.updated'
              | 'member.planConnection.canceled',
            timestamp: data.timestamp ?? Date.now(),
            memberId: payload.id ?? planConnection.memberId ?? '',
            planConnectionId: planConnection.id ?? payload.planConnectionId,
            active: planConnection.active,
            status: planConnection.status,
            planType: planConnection.type,
            planId: planConnection.planId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.memberId}-${ctx.input.planConnectionId ?? 'unknown'}-${ctx.input.timestamp}`,
        output: {
          memberId: ctx.input.memberId,
          planConnectionId: ctx.input.planConnectionId,
          active: ctx.input.active,
          status: ctx.input.status,
          planType: ctx.input.planType,
          planId: ctx.input.planId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
