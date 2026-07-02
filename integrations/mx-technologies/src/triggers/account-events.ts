import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let accountEvents = SlateTrigger.create(spec, {
  name: 'Account Events',
  key: 'account_events',
  description:
    "Triggered when account data changes for a user's connected accounts (created, updated, deleted)."
})
  .input(
    z.object({
      action: z.string().describe('Event action (created, updated, deleted)'),
      userGuid: z.string().describe('GUID of the user'),
      accountGuid: z.string().describe('GUID of the account'),
      payload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      userGuid: z.string().describe('GUID of the user'),
      accountGuid: z.string().describe('GUID of the account'),
      memberGuid: z.string().optional().nullable().describe('GUID of the member'),
      name: z.string().optional().nullable().describe('Account name'),
      type: z.string().optional().nullable().describe('Account type'),
      balance: z.number().optional().nullable().describe('Current balance'),
      availableBalance: z.number().optional().nullable().describe('Available balance'),
      currencyCode: z.string().optional().nullable().describe('Currency code'),
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
            userGuid: data.user_guid || data.account?.user_guid || '',
            accountGuid: data.account_guid || data.account?.guid || '',
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let account = ctx.input.payload?.account || {};

      return {
        type: `account.${ctx.input.action}`,
        id: `${ctx.input.accountGuid}-${ctx.input.action}-${account.version || Date.now()}`,
        output: {
          userGuid: ctx.input.userGuid,
          accountGuid: ctx.input.accountGuid,
          memberGuid: account.member_guid,
          name: account.name,
          type: account.type,
          balance: account.balance,
          availableBalance: account.available_balance,
          currencyCode: account.currency_code,
          version: account.version
        }
      };
    }
  })
  .build();
