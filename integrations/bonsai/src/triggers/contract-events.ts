import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let contractEvents = SlateTrigger.create(spec, {
  name: 'Contract Events',
  key: 'contract_events',
  description:
    'Triggers when a contract is viewed or signed by a client or contractor in Bonsai.'
})
  .input(
    z.object({
      eventType: z.enum(['viewed', 'signed']).describe('Type of contract event'),
      contractId: z.string().describe('ID of the contract'),
      title: z.string().optional().describe('Contract title'),
      clientName: z.string().optional().describe('Client or contractor name'),
      clientEmail: z.string().optional().describe('Client or contractor email'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      contractId: z.string().describe('ID of the contract'),
      title: z.string().optional().describe('Contract title'),
      clientName: z.string().optional().describe('Client or contractor name'),
      clientEmail: z.string().optional().describe('Client or contractor email'),
      eventTimestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event_type ?? data.eventType ?? data.type ?? '';
      let normalizedType: 'viewed' | 'signed' = 'viewed';
      if (eventType.includes('signed') || eventType.includes('sign')) {
        normalizedType = 'signed';
      }

      let contract = data.contract ?? data.resource ?? data;

      return {
        inputs: [
          {
            eventType: normalizedType,
            contractId: contract.id ?? contract.contract_id ?? data.id ?? '',
            title: contract.title ?? contract.name ?? undefined,
            clientName:
              contract.client_name ?? contract.clientName ?? data.client_name ?? undefined,
            clientEmail:
              contract.client_email ?? contract.clientEmail ?? data.client_email ?? undefined,
            timestamp: data.timestamp ?? data.created_at ?? new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `contract.${ctx.input.eventType}`,
        id: `contract-${ctx.input.contractId}-${ctx.input.eventType}-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          contractId: ctx.input.contractId,
          title: ctx.input.title,
          clientName: ctx.input.clientName,
          clientEmail: ctx.input.clientEmail,
          eventTimestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
