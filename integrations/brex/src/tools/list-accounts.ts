import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let accountSchema = z.object({
  accountId: z.string().describe('Unique identifier of the account'),
  accountType: z.string().describe('Account type: card or cash'),
  name: z.string().nullable().optional().describe('Account name'),
  status: z.string().optional().describe('Account status'),
  currentBalance: z
    .object({
      amount: z.number().describe('Balance in cents'),
      currency: z.string().nullable().describe('Currency code')
    })
    .nullable()
    .optional()
    .describe('Current balance (cash accounts only)'),
  availableBalance: z
    .object({
      amount: z.number().describe('Balance in cents'),
      currency: z.string().nullable().describe('Currency code')
    })
    .nullable()
    .optional()
    .describe('Available balance (cash accounts only)'),
  accountNumber: z
    .string()
    .nullable()
    .optional()
    .describe('Account number (cash accounts only)'),
  routingNumber: z
    .string()
    .nullable()
    .optional()
    .describe('Routing number (cash accounts only)'),
  isPrimary: z.boolean().optional().describe('Whether this is the primary account')
});

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List Brex card and cash accounts. Use **accountType** to filter by card or cash accounts. Cash accounts include balance information, account numbers, and routing details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountType: z
        .enum(['card', 'cash', 'all'])
        .optional()
        .describe('Filter by account type (defaults to all)')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountSchema).describe('List of accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let accounts: any[] = [];
    let type = ctx.input.accountType ?? 'all';

    if (type === 'card' || type === 'all') {
      try {
        let cardAccounts = await client.listCardAccounts();
        accounts.push(
          ...cardAccounts.items.map((a: any) => ({
            accountId: a.id,
            accountType: 'card',
            name: a.name ?? null,
            status: a.status,
            currentBalance: null,
            availableBalance: null,
            accountNumber: null,
            routingNumber: null,
            isPrimary: false
          }))
        );
      } catch (_e) {
        ctx.warn('Could not fetch card accounts');
      }
    }

    if (type === 'cash' || type === 'all') {
      try {
        let cashAccounts = await client.listCashAccounts();
        let primaryAccount = await client.getPrimaryCashAccount().catch(() => null);

        accounts.push(
          ...cashAccounts.items.map((a: any) => ({
            accountId: a.id,
            accountType: 'cash',
            name: a.name ?? null,
            status: a.status,
            currentBalance: a.current_balance
              ? { amount: a.current_balance.amount, currency: a.current_balance.currency }
              : null,
            availableBalance: a.available_balance
              ? { amount: a.available_balance.amount, currency: a.available_balance.currency }
              : null,
            accountNumber: a.account_number ?? null,
            routingNumber: a.routing_number ?? null,
            isPrimary: primaryAccount ? a.id === primaryAccount.id : false
          }))
        );
      } catch (_e) {
        ctx.warn('Could not fetch cash accounts');
      }
    }

    return {
      output: { accounts },
      message: `Found **${accounts.length}** account(s).`
    };
  })
  .build();
