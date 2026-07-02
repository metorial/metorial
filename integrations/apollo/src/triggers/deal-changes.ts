import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let dealChanges = SlateTrigger.create(spec, {
  name: 'Deal Changes',
  key: 'deal_changes',
  description:
    'Polls for new or updated deals (opportunities) in your Apollo account. Detects deals that have been created or modified since the last check.'
})
  .input(
    z.object({
      dealId: z.string().describe('Apollo deal/opportunity ID'),
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the deal was newly created or updated'),
      name: z.string().optional(),
      amount: z.number().optional(),
      closedDate: z.string().optional(),
      ownerId: z.string().optional(),
      accountId: z.string().optional(),
      dealStageId: z.string().optional(),
      stageName: z.string().optional(),
      status: z.string().optional(),
      source: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('Apollo deal/opportunity ID'),
      name: z.string().optional(),
      amount: z.number().optional(),
      closedDate: z.string().optional(),
      ownerId: z.string().optional(),
      accountId: z.string().optional(),
      dealStageId: z.string().optional(),
      stageName: z.string().optional(),
      status: z.string().optional(),
      source: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let knownDealIds = (ctx.state?.knownDealIds as Record<string, string>) || {};

      let result = await client.listDeals({
        page: 1,
        perPage: 100
      });

      let inputs: Array<{
        dealId: string;
        eventType: 'created' | 'updated';
        name?: string;
        amount?: number;
        closedDate?: string;
        ownerId?: string;
        accountId?: string;
        dealStageId?: string;
        stageName?: string;
        status?: string;
        source?: string;
        createdAt?: string;
        updatedAt?: string;
      }> = [];

      let updatedKnownIds: Record<string, string> = { ...knownDealIds };

      for (let deal of result.deals) {
        if (!deal.id) continue;

        let updatedAt = deal.updated_at || deal.created_at || '';
        let previousUpdatedAt = knownDealIds[deal.id];

        if (!previousUpdatedAt) {
          if (lastPolledAt && deal.created_at && deal.created_at > lastPolledAt) {
            inputs.push({
              dealId: deal.id,
              eventType: 'created',
              name: deal.name,
              amount: deal.amount,
              closedDate: deal.closed_date,
              ownerId: deal.owner_id,
              accountId: deal.account_id,
              dealStageId: deal.opportunity_stage_id || deal.deal_stage_id,
              stageName: deal.stage_name,
              status: deal.status,
              source: deal.source,
              createdAt: deal.created_at,
              updatedAt: deal.updated_at
            });
          } else if (!lastPolledAt) {
            // First poll — just record state, don't emit
          }
        } else if (updatedAt && updatedAt !== previousUpdatedAt) {
          inputs.push({
            dealId: deal.id,
            eventType: 'updated',
            name: deal.name,
            amount: deal.amount,
            closedDate: deal.closed_date,
            ownerId: deal.owner_id,
            accountId: deal.account_id,
            dealStageId: deal.opportunity_stage_id || deal.deal_stage_id,
            stageName: deal.stage_name,
            status: deal.status,
            source: deal.source,
            createdAt: deal.created_at,
            updatedAt: deal.updated_at
          });
        }

        updatedKnownIds[deal.id] = updatedAt;
      }

      return {
        inputs,
        updatedState: {
          lastPolledAt: new Date().toISOString(),
          knownDealIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `deal.${ctx.input.eventType}`,
        id: `${ctx.input.dealId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          dealId: ctx.input.dealId,
          name: ctx.input.name,
          amount: ctx.input.amount,
          closedDate: ctx.input.closedDate,
          ownerId: ctx.input.ownerId,
          accountId: ctx.input.accountId,
          dealStageId: ctx.input.dealStageId,
          stageName: ctx.input.stageName,
          status: ctx.input.status,
          source: ctx.input.source,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
