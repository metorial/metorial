import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newContributions = SlateTrigger.create(spec, {
  name: 'New Contributions',
  key: 'new_contributions',
  description: 'Triggers when new contributions are made to your Daffy fund.'
})
  .input(
    z.object({
      contributionId: z.number().describe('Unique contribution identifier'),
      units: z.number().describe('Number of units contributed'),
      type: z.string().describe('Payment type'),
      status: z.string().describe('Contribution status'),
      valuation: z.number().describe('Unit price in USD'),
      currency: z.string().describe('Currency or asset type'),
      createdAt: z.string().describe('Creation timestamp'),
      receivedAt: z.string().nullable().describe('Receipt timestamp'),
      completedAt: z.string().nullable().describe('Completion timestamp')
    })
  )
  .output(
    z.object({
      contributionId: z.number().describe('Unique contribution identifier'),
      units: z.number().describe('Number of units contributed'),
      type: z
        .string()
        .describe(
          'Payment type (e.g., bank_account_scheduled_deposit, credit_card_scheduled_deposit, crypto_payment, stock_payment)'
        ),
      status: z
        .string()
        .describe('Contribution status (pending, success, waiting_for_funds, failed)'),
      valuation: z.number().describe('Unit price in USD'),
      currency: z.string().describe('Currency or asset type'),
      createdAt: z.string().describe('Creation timestamp'),
      receivedAt: z.string().nullable().describe('Receipt timestamp'),
      completedAt: z.string().nullable().describe('Completion timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.getContributions(1);

      let lastSeenId = ctx.state?.lastSeenContributionId as number | undefined;
      let newContributions = lastSeenId
        ? result.items.filter(c => c.id > lastSeenId)
        : result.items;

      let highestId =
        result.items.length > 0 ? Math.max(...result.items.map(c => c.id)) : lastSeenId;

      return {
        inputs: newContributions.map(c => ({
          contributionId: c.id,
          units: c.units,
          type: c.type,
          status: c.status,
          valuation: c.valuation,
          currency: c.currency,
          createdAt: c.created_at,
          receivedAt: c.received_at,
          completedAt: c.completed_at
        })),
        updatedState: {
          lastSeenContributionId: highestId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'contribution.created',
        id: String(ctx.input.contributionId),
        output: {
          contributionId: ctx.input.contributionId,
          units: ctx.input.units,
          type: ctx.input.type,
          status: ctx.input.status,
          valuation: ctx.input.valuation,
          currency: ctx.input.currency,
          createdAt: ctx.input.createdAt,
          receivedAt: ctx.input.receivedAt,
          completedAt: ctx.input.completedAt
        }
      };
    }
  })
  .build();
