import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let dealChanges = SlateTrigger.create(spec, {
  name: 'Deal Changes',
  key: 'deal_changes',
  description:
    'Triggers when deals are created or updated in Freshsales. Monitors deals via the default or first available view.'
})
  .input(
    z.object({
      dealId: z.number().describe('ID of the deal'),
      name: z.string().nullable().optional(),
      amount: z.number().nullable().optional(),
      expectedClose: z.string().nullable().optional(),
      dealStageId: z.number().nullable().optional(),
      ownerId: z.number().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional(),
      isNew: z.boolean().describe('Whether this deal is newly created since last poll')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('ID of the deal'),
      name: z.string().nullable().optional(),
      amount: z.number().nullable().optional(),
      expectedClose: z.string().nullable().optional(),
      dealStageId: z.number().nullable().optional(),
      ownerId: z.number().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let viewId = ctx.state?.viewId;
      if (!viewId) {
        let filters = await client.getDealFilters();
        let defaultFilter =
          filters.find((f: Record<string, any>) => f.is_default) || filters[0];
        if (!defaultFilter) {
          return { inputs: [], updatedState: ctx.state || {} };
        }
        viewId = defaultFilter.id;
      }

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let result = await client.listDeals(viewId, {
        sort: 'updated_at',
        sortType: 'desc',
        page: 1
      });

      let deals = result.deals || [];
      let newInputs: any[] = [];

      for (let deal of deals) {
        if (lastPolledAt && deal.updated_at && deal.updated_at <= lastPolledAt) {
          break;
        }
        let isNew = !lastPolledAt || (deal.created_at && deal.created_at > lastPolledAt);
        newInputs.push({
          dealId: deal.id,
          name: deal.name,
          amount: deal.amount,
          expectedClose: deal.expected_close,
          dealStageId: deal.deal_stage_id,
          ownerId: deal.owner_id,
          createdAt: deal.created_at,
          updatedAt: deal.updated_at,
          isNew
        });
      }

      let updatedLastPolledAt =
        deals.length > 0 && deals[0]?.updated_at ? deals[0].updated_at : lastPolledAt;

      return {
        inputs: newInputs,
        updatedState: {
          viewId,
          lastPolledAt: updatedLastPolledAt
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.isNew ? 'deal.created' : 'deal.updated';
      return {
        type: eventType,
        id: `${ctx.input.dealId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          dealId: ctx.input.dealId,
          name: ctx.input.name,
          amount: ctx.input.amount,
          expectedClose: ctx.input.expectedClose,
          dealStageId: ctx.input.dealStageId,
          ownerId: ctx.input.ownerId,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
