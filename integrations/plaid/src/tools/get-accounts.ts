import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

let balanceSchema = z
  .object({
    available: z.number().nullable().describe('Funds available for withdrawal'),
    current: z.number().nullable().describe('Total current balance'),
    limit: z.number().nullable().optional().describe('Credit limit (credit accounts only)'),
    isoCurrencyCode: z.string().nullable().optional().describe('ISO 4217 currency code')
  })
  .describe('Account balances');

let accountSchema = z.object({
  accountId: z.string().describe('Plaid account identifier'),
  name: z.string().describe('Account name'),
  officialName: z
    .string()
    .nullable()
    .optional()
    .describe('Official account name from institution'),
  type: z
    .string()
    .describe('Account type: depository, credit, loan, investment, brokerage, other'),
  subtype: z
    .string()
    .nullable()
    .optional()
    .describe('Account subtype, e.g. checking, savings, credit card'),
  mask: z.string().nullable().optional().describe('Last 4 digits of the account number'),
  balances: balanceSchema
});

export let getAccountsTool = SlateTool.create(spec, {
  name: 'Get Accounts',
  key: 'get_accounts',
  description: `Retrieve all financial accounts linked to a Plaid Item. Returns account names, types, subtypes, masks, and cached balance information. Use this to see what accounts a user has connected. For real-time balances, use the **Get Balances** tool instead.`,
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
        .describe('Specific account IDs to retrieve. Omit to get all accounts.')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountSchema),
      itemId: z.string().describe('The Plaid Item ID'),
      institutionId: z.string().nullable().optional().describe('The institution ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.getAccounts(ctx.input.accessToken, ctx.input.accountIds);

    let accounts = (result.accounts || []).map((a: any) => ({
      accountId: a.account_id,
      name: a.name,
      officialName: a.official_name,
      type: a.type,
      subtype: a.subtype,
      mask: a.mask,
      balances: {
        available: a.balances?.available ?? null,
        current: a.balances?.current ?? null,
        limit: a.balances?.limit ?? null,
        isoCurrencyCode: a.balances?.iso_currency_code ?? null
      }
    }));

    return {
      output: {
        accounts,
        itemId: result.item?.item_id,
        institutionId: result.item?.institution_id
      },
      message: `Retrieved **${accounts.length}** account(s) from Item \`${result.item?.item_id}\`.`
    };
  })
  .build();
