import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let dealEvents = SlateTrigger.create(spec, {
  name: 'Deal Events',
  key: 'deal_events',
  description:
    'Triggers when deals are created or updated in Salesmate. Captures stage changes, status changes, and other deal modifications.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of deal event'),
      dealId: z.string().describe('ID of the deal'),
      deal: z.record(z.string(), z.unknown()).describe('Deal record data')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('ID of the deal'),
      title: z.string().optional().describe('Deal title'),
      pipeline: z.string().optional().describe('Pipeline name'),
      stage: z.string().optional().describe('Pipeline stage'),
      status: z.string().optional().describe('Deal status'),
      dealValue: z.unknown().optional().describe('Deal monetary value'),
      owner: z.unknown().optional().describe('Deal owner'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp'),
      rawRecord: z.record(z.string(), z.unknown()).describe('Full deal record')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = createClient(ctx);
      let lastPolledAt = (ctx.state as Record<string, unknown>)?.lastPolledAt as
        | string
        | undefined;
      let now = new Date().toISOString();

      let fields = [
        'title',
        'pipeline',
        'stage',
        'status',
        'dealValue',
        'owner',
        'createdAt',
        'modifiedAt'
      ];

      let filters = lastPolledAt
        ? [
            {
              moduleName: 'Deal',
              field: { fieldName: 'modifiedAt' },
              condition: 'GREATER_THAN',
              data: lastPolledAt
            }
          ]
        : [];

      let query =
        filters.length > 0
          ? {
              group: {
                operator: 'AND' as const,
                rules: filters
              }
            }
          : undefined;

      let result = await client.searchDeals({
        fields,
        query,
        sortBy: 'modifiedAt',
        sortOrder: 'desc',
        pageNo: 1,
        rows: 100
      });

      let records = result?.Data?.data ?? [];

      let inputs = records.map((record: Record<string, unknown>) => {
        let recordId = String(record.id ?? '');
        let createdAt = record.createdAt as string | undefined;
        let modifiedAt = record.modifiedAt as string | undefined;
        let isNew = !lastPolledAt || (createdAt && modifiedAt && createdAt === modifiedAt);
        return {
          eventType: isNew ? ('created' as const) : ('updated' as const),
          dealId: recordId,
          deal: record
        };
      });

      return {
        inputs,
        updatedState: {
          lastPolledAt: now
        }
      };
    },
    handleEvent: async ctx => {
      let record = ctx.input.deal;
      return {
        type: `deal.${ctx.input.eventType}`,
        id: `deal-${ctx.input.dealId}-${Date.now()}`,
        output: {
          dealId: ctx.input.dealId,
          title: record.title as string | undefined,
          pipeline: record.pipeline as string | undefined,
          stage: record.stage as string | undefined,
          status: record.status as string | undefined,
          dealValue: record.dealValue,
          owner: record.owner,
          createdAt: record.createdAt as string | undefined,
          modifiedAt: record.modifiedAt as string | undefined,
          rawRecord: record
        }
      };
    }
  })
  .build();
