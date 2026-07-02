import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

let balanceAccountSchema = z.object({
  accountId: z.string().describe('Plaid account identifier'),
  name: z.string().describe('Account name'),
  type: z.string().describe('Account type'),
  subtype: z.string().nullable().optional().describe('Account subtype'),
  mask: z.string().nullable().optional().describe('Last 4 digits of the account number'),
  available: z.number().nullable().describe('Real-time available balance'),
  current: z.number().nullable().describe('Real-time current balance'),
  limit: z.number().nullable().optional().describe('Credit limit'),
  isoCurrencyCode: z.string().nullable().optional().describe('ISO 4217 currency code')
});

export let getBalancesTool = SlateTool.create(spec, {
  name: 'Get Balances',
  key: 'get_balances',
  description: `Retrieve **real-time** balance information for accounts linked to a Plaid Item. Unlike cached balances from Get Accounts, this makes a live request to the financial institution. Useful for preventing ACH returns or verifying sufficient funds.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accessToken: z.string().describe('Access token for the Plaid Item'),
      accountIds: z
        .array(z.string())
        .optional()
        .describe('Specific account IDs to check balances for. Omit to get all.')
    })
  )
  .output(
    z.object({
      accounts: z.array(balanceAccountSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.getBalance(ctx.input.accessToken, ctx.input.accountIds);

    let accounts = (result.accounts || []).map((a: any) => ({
      accountId: a.account_id,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      mask: a.mask,
      available: a.balances?.available ?? null,
      current: a.balances?.current ?? null,
      limit: a.balances?.limit ?? null,
      isoCurrencyCode: a.balances?.iso_currency_code ?? null
    }));

    return {
      output: { accounts },
      message: `Retrieved real-time balances for **${accounts.length}** account(s).`
    };
  })
  .build();
