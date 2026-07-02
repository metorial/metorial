import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let dealUpdated = SlateTrigger.create(spec, {
  name: 'Deal Updated',
  key: 'deal_updated',
  description: 'Triggers when a deal is updated in the Bonsai sales pipeline.'
})
  .input(
    z.object({
      dealId: z.string().describe('ID of the deal'),
      title: z.string().optional().describe('Deal title'),
      clientEmail: z.string().optional().describe('Client email'),
      pipelineStage: z.string().optional().describe('Current pipeline stage'),
      value: z.number().optional().describe('Deal value'),
      ownerEmail: z.string().optional().describe('Deal owner email'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('ID of the deal'),
      title: z.string().optional().describe('Deal title'),
      clientEmail: z.string().optional().describe('Client email'),
      pipelineStage: z.string().optional().describe('Current pipeline stage'),
      value: z.number().optional().describe('Deal value'),
      ownerEmail: z.string().optional().describe('Deal owner email'),
      eventTimestamp: z.string().optional().describe('When the update occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let deal = data.deal ?? data.resource ?? data;

      return {
        inputs: [
          {
            dealId: deal.id ?? deal.deal_id ?? data.id ?? '',
            title: deal.title ?? deal.name ?? undefined,
            clientEmail: deal.client_email ?? deal.clientEmail ?? undefined,
            pipelineStage:
              deal.pipeline_stage ?? deal.pipelineStage ?? deal.stage ?? undefined,
            value: deal.value ?? undefined,
            ownerEmail: deal.owner_email ?? deal.ownerEmail ?? undefined,
            timestamp: data.timestamp ?? data.created_at ?? new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'deal.updated',
        id: `deal-${ctx.input.dealId}-updated-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          dealId: ctx.input.dealId,
          title: ctx.input.title,
          clientEmail: ctx.input.clientEmail,
          pipelineStage: ctx.input.pipelineStage,
          value: ctx.input.value,
          ownerEmail: ctx.input.ownerEmail,
          eventTimestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
