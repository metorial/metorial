import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let dealChanges = SlateTrigger.create(spec, {
  name: 'Deal Changes',
  key: 'deal_changes',
  description: 'Triggers when a deal is created or updated in Pipeline CRM.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of change detected'),
      dealId: z.number().describe('ID of the affected deal'),
      deal: z.any().describe('Full deal record from the API')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('Unique deal ID'),
      name: z.string().describe('Deal name'),
      summary: z.string().nullable().optional().describe('Brief description'),
      value: z.number().nullable().optional().describe('Monetary value'),
      currency: z.string().nullable().optional().describe('Currency code'),
      dealStageId: z.number().nullable().optional().describe('Pipeline stage ID'),
      probability: z.number().nullable().optional().describe('Win probability'),
      expectedCloseDate: z.string().nullable().optional().describe('Expected close date'),
      userId: z.number().nullable().optional().describe('Owner user ID'),
      companyName: z.string().nullable().optional().describe('Associated company name'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        appKey: ctx.auth.appKey
      });

      let lastPolledAt = (ctx.state as any)?.lastPolledAt as string | undefined;

      let result = await client.listDeals({
        page: 1,
        perPage: 200,
        sort: 'updated_at'
      });

      let entries = result.entries ?? [];

      let newEntries = lastPolledAt
        ? entries.filter((deal: any) => deal.updated_at && deal.updated_at > lastPolledAt)
        : entries;

      let inputs = newEntries.map((deal: any) => {
        let isNew = !lastPolledAt || (deal.created_at && deal.created_at > lastPolledAt);
        return {
          eventType: isNew ? ('created' as const) : ('updated' as const),
          dealId: deal.id,
          deal
        };
      });

      let latestTimestamp =
        entries.length > 0
          ? entries.reduce(
              (max: string, d: any) => (d.updated_at > max ? d.updated_at : max),
              entries[0]!.updated_at
            )
          : lastPolledAt;

      return {
        inputs,
        updatedState: {
          lastPolledAt: latestTimestamp ?? lastPolledAt
        }
      };
    },

    handleEvent: async ctx => {
      let deal = ctx.input.deal;

      return {
        type: `deal.${ctx.input.eventType}`,
        id: `deal-${ctx.input.dealId}-${deal.updated_at ?? Date.now()}`,
        output: {
          dealId: deal.id,
          name: deal.name,
          summary: deal.summary ?? null,
          value: deal.value ?? null,
          currency: deal.currency ?? null,
          dealStageId: deal.deal_stage_id ?? deal.stage_id ?? null,
          probability: deal.probability ?? null,
          expectedCloseDate: deal.expected_close_date ?? null,
          userId: deal.user_id ?? null,
          companyName: deal.company?.name ?? null,
          createdAt: deal.created_at ?? null,
          updatedAt: deal.updated_at ?? null
        }
      };
    }
  })
  .build();
