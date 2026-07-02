import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let holdingEvents = SlateTrigger.create(spec, {
  name: 'Holding Events',
  key: 'holding_events',
  description: 'Triggered when investment holdings data changes for a user.'
})
  .input(
    z.object({
      action: z.string().describe('Event action (created, updated, deleted)'),
      userGuid: z.string().describe('GUID of the user'),
      holdingGuid: z.string().describe('GUID of the holding'),
      payload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      userGuid: z.string().describe('GUID of the user'),
      holdingGuid: z.string().describe('GUID of the holding'),
      accountGuid: z.string().optional().nullable().describe('GUID of the account'),
      symbol: z.string().optional().nullable().describe('Ticker symbol'),
      quantity: z.number().optional().nullable().describe('Number of units'),
      marketValue: z.number().optional().nullable().describe('Current market value'),
      currentPrice: z.number().optional().nullable().describe('Current price per unit'),
      version: z.number().optional().nullable().describe('Object version for change detection')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let action = data.action || 'updated';

      return {
        inputs: [
          {
            action,
            userGuid: data.user_guid || data.holding?.user_guid || '',
            holdingGuid: data.holding_guid || data.holding?.guid || '',
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let holding = ctx.input.payload?.holding || {};

      return {
        type: `holding.${ctx.input.action}`,
        id: `${ctx.input.holdingGuid}-${ctx.input.action}-${holding.version || Date.now()}`,
        output: {
          userGuid: ctx.input.userGuid,
          holdingGuid: ctx.input.holdingGuid,
          accountGuid: holding.account_guid,
          symbol: holding.symbol,
          quantity: holding.quantity,
          marketValue: holding.market_value,
          currentPrice: holding.current_price,
          version: holding.version
        }
      };
    }
  })
  .build();
