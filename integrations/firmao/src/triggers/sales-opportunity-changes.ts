import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let salesOpportunityChanges = SlateTrigger.create(spec, {
  name: 'Sales Opportunity Changes',
  key: 'sales_opportunity_changes',
  description:
    'Triggers when sales opportunities are created or modified in Firmao. Polls for recently modified opportunity records.'
})
  .input(
    z.object({
      changeType: z.enum(['created', 'updated']).describe('Type of change detected'),
      salesOpportunityId: z.number().describe('ID of the changed opportunity'),
      raw: z.any().describe('Full opportunity record from the API')
    })
  )
  .output(
    z.object({
      salesOpportunityId: z.number(),
      label: z.string().optional(),
      salesOpportunityValue: z.number().optional(),
      currency: z.string().optional(),
      stage: z.string().optional(),
      status: z.string().optional(),
      customerId: z.number().optional(),
      customerName: z.string().optional(),
      salesDate: z.string().optional(),
      creationDate: z.string().optional(),
      lastModificationDate: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FirmaoClient({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      let filters: Record<string, string> = {};
      if (lastPollTime) {
        filters['lastModificationDate(gt)'] = lastPollTime;
      }

      let result = await client.list('salesopportunities', {
        sort: 'lastModificationDate',
        dir: 'DESC',
        limit: 50,
        filters
      });

      let now = new Date().toISOString();

      let inputs = result.data.map((o: any) => {
        let isNew =
          !lastPollTime || (o.creationDate && o.creationDate === o.lastModificationDate);
        return {
          changeType: isNew ? ('created' as const) : ('updated' as const),
          salesOpportunityId: o.id,
          raw: o
        };
      });

      return {
        inputs,
        updatedState: {
          lastPollTime:
            result.data.length > 0
              ? (result.data[0].lastModificationDate ?? now)
              : (lastPollTime ?? now)
        }
      };
    },

    handleEvent: async ctx => {
      let o = ctx.input.raw;
      return {
        type: `sales_opportunity.${ctx.input.changeType}`,
        id: `sales-opportunity-${ctx.input.salesOpportunityId}-${o.lastModificationDate ?? Date.now()}`,
        output: {
          salesOpportunityId: ctx.input.salesOpportunityId,
          label: o.label,
          salesOpportunityValue: o.salesOpportunityValue,
          currency: o.currency,
          stage: o.stage,
          status: o.status,
          customerId: typeof o.customer === 'object' ? o.customer?.id : o.customer,
          customerName: typeof o.customer === 'object' ? o.customer?.name : undefined,
          salesDate: o.salesDate,
          creationDate: o.creationDate,
          lastModificationDate: o.lastModificationDate
        }
      };
    }
  })
  .build();
