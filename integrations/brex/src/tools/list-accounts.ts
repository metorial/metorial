import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapAccount } from '../lib/schemas';
import { fail } from '../lib/validation';
import { spec } from '../spec';

let accountSchema = z.object({
  accountId: z.string().describe('Unique identifier of the account'),
  accountType: z.string().describe('Account type: card or cash'),
  name: z.string().nullable().optional().describe('Account name'),
  status: z.string().nullish().describe('Account status'),
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
    const client = new Client({ token: ctx.auth.token });
    const type = ctx.input.accountType ?? 'all';
    const accounts: ReturnType<typeof mapAccount>[] = [];
    if (type !== 'cash')
      accounts.push(...(await client.listCardAccounts()).map(a => mapAccount(a, 'card')));
    if (type !== 'card') {
      const result = await client.listCashAccounts();
      if (result.next_cursor)
        fail(
          'Brex returned incomplete cash-account discovery without a documented continuation request. No complete account list can be reported.'
        );
      accounts.push(...result.items.map(a => mapAccount(a, 'cash')));
    }
    return { output: { accounts }, message: `Returned ${accounts.length} accounts.` };
  })
  .build();
