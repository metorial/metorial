import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

export let newSaleTrigger = SlateTrigger.create(spec, {
  name: 'New Sale',
  key: 'new_sale',
  description:
    'Triggers when a new sale is recorded on your Cults3D account. Polls for recent sales and detects new ones since the last check.'
})
  .input(
    z.object({
      saleId: z.string().describe('Unique sale ID'),
      createdAt: z.string().nullable().describe('Sale timestamp'),
      incomeValue: z.number().nullable().describe('Income from the sale in USD'),
      creationIdentifier: z.string().nullable().describe('Identifier of the sold creation'),
      creationName: z.string().nullable().describe('Name of the sold creation'),
      creationUrl: z.string().nullable().describe('URL of the sold creation'),
      buyerNick: z.string().nullable().describe('Buyer username'),
      creationViewsCount: z.number().nullable().describe('Views at time of sale'),
      creationLikesCount: z.number().nullable().describe('Likes at time of sale'),
      discountPercentage: z.number().nullable().describe('Discount percentage applied')
    })
  )
  .output(
    z.object({
      saleId: z.string().describe('Unique sale ID'),
      createdAt: z.string().nullable().describe('Sale timestamp (ISO-8601)'),
      incomeValue: z.number().nullable().describe('Income from the sale in USD'),
      creationIdentifier: z.string().nullable().describe('Identifier of the sold creation'),
      creationName: z.string().nullable().describe('Name of the sold creation'),
      creationUrl: z.string().nullable().describe('URL of the sold creation'),
      buyerNick: z.string().nullable().describe('Username of the buyer'),
      creationViewsCount: z.number().nullable().describe('Creation views at time of sale'),
      creationLikesCount: z.number().nullable().describe('Creation likes at time of sale'),
      discountPercentage: z.number().nullable().describe('Discount percentage applied')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CultsClient({
        token: ctx.auth.token,
        username: ctx.auth.username
      });

      let lastSeenSaleId: string | null = ctx.state?.lastSeenSaleId ?? null;

      let result = await client.getMySales({
        limit: 20,
        offset: 0,
        currency: 'USD'
      });

      let sales = result.results;

      let newSales: any[] = [];
      for (let sale of sales) {
        if (sale.id === lastSeenSaleId) {
          break;
        }
        newSales.push(sale);
      }

      let inputs = newSales.map((s: any) => ({
        saleId: s.id,
        createdAt: s.createdAt,
        incomeValue: s.income?.value ?? null,
        creationIdentifier: s.creation?.identifier ?? null,
        creationName: s.creation?.name ?? null,
        creationUrl: s.creation?.url ?? null,
        buyerNick: s.user?.nick ?? null,
        creationViewsCount: s.creationViewsCount,
        creationLikesCount: s.creationLikesCount,
        discountPercentage: s.discount?.percentage ?? null
      }));

      let updatedState = {
        lastSeenSaleId: sales.length > 0 ? sales[0].id : lastSeenSaleId
      };

      return {
        inputs,
        updatedState
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'sale.created',
        id: ctx.input.saleId,
        output: {
          saleId: ctx.input.saleId,
          createdAt: ctx.input.createdAt,
          incomeValue: ctx.input.incomeValue,
          creationIdentifier: ctx.input.creationIdentifier,
          creationName: ctx.input.creationName,
          creationUrl: ctx.input.creationUrl,
          buyerNick: ctx.input.buyerNick,
          creationViewsCount: ctx.input.creationViewsCount,
          creationLikesCount: ctx.input.creationLikesCount,
          discountPercentage: ctx.input.discountPercentage
        }
      };
    }
  })
  .build();
