import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let proposalEvents = SlateTrigger.create(spec, {
  name: 'Proposal Events',
  key: 'proposal_events',
  description: 'Triggers when a proposal is viewed or accepted by a client in Bonsai.'
})
  .input(
    z.object({
      eventType: z.enum(['viewed', 'accepted']).describe('Type of proposal event'),
      proposalId: z.string().describe('ID of the proposal'),
      title: z.string().optional().describe('Proposal title'),
      clientName: z.string().optional().describe('Client name'),
      clientEmail: z.string().optional().describe('Client email'),
      amount: z.number().optional().describe('Proposal amount'),
      currency: z.string().optional().describe('Currency code'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      proposalId: z.string().describe('ID of the proposal'),
      title: z.string().optional().describe('Proposal title'),
      clientName: z.string().optional().describe('Client name'),
      clientEmail: z.string().optional().describe('Client email'),
      amount: z.number().optional().describe('Proposal amount'),
      currency: z.string().optional().describe('Currency code'),
      eventTimestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event_type ?? data.eventType ?? data.type ?? '';
      let normalizedType: 'viewed' | 'accepted' = 'viewed';
      if (eventType.includes('accepted') || eventType.includes('accept')) {
        normalizedType = 'accepted';
      }

      let proposal = data.proposal ?? data.resource ?? data;

      return {
        inputs: [
          {
            eventType: normalizedType,
            proposalId: proposal.id ?? proposal.proposal_id ?? data.id ?? '',
            title: proposal.title ?? proposal.name ?? undefined,
            clientName:
              proposal.client_name ?? proposal.clientName ?? data.client_name ?? undefined,
            clientEmail:
              proposal.client_email ?? proposal.clientEmail ?? data.client_email ?? undefined,
            amount: proposal.amount ?? proposal.total ?? undefined,
            currency: proposal.currency ?? undefined,
            timestamp: data.timestamp ?? data.created_at ?? new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `proposal.${ctx.input.eventType}`,
        id: `proposal-${ctx.input.proposalId}-${ctx.input.eventType}-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          proposalId: ctx.input.proposalId,
          title: ctx.input.title,
          clientName: ctx.input.clientName,
          clientEmail: ctx.input.clientEmail,
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          eventTimestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
