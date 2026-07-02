import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let accountSchema = z.object({
  accountId: z.string().describe('Unique identifier for the account'),
  name: z.string().describe('Account name'),
  type: z.string().describe('Account type (checking, savings, creditCard, etc.)'),
  onBudget: z.boolean().describe('Whether the account is on-budget'),
  closed: z.boolean().describe('Whether the account is closed'),
  balance: z.number().describe('Current balance in milliunits'),
  clearedBalance: z.number().describe('Cleared balance in milliunits'),
  unclearedBalance: z.number().describe('Uncleared balance in milliunits'),
  note: z.string().nullable().optional().describe('Account note'),
  directImportLinked: z
    .boolean()
    .optional()
    .describe('Whether a linked bank import is set up'),
  directImportInError: z
    .boolean()
    .optional()
    .describe('Whether the linked import is in an error state'),
  deleted: z.boolean().describe('Whether the account has been deleted')
});

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List all financial accounts in a budget, including balances and account type. Accounts include checking, savings, credit cards, loans, and other asset/liability types.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      budgetId: z.string().optional().describe('Budget ID. Defaults to the configured budget.')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountSchema).describe('List of accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;
    let { accounts } = await client.getAccounts(budgetId);

    let mapped = accounts.map((a: any) => ({
      accountId: a.id,
      name: a.name,
      type: a.type,
      onBudget: a.on_budget,
      closed: a.closed,
      balance: a.balance,
      clearedBalance: a.cleared_balance,
      unclearedBalance: a.uncleared_balance,
      note: a.note,
      directImportLinked: a.direct_import_linked,
      directImportInError: a.direct_import_in_error,
      deleted: a.deleted
    }));

    let activeAccounts = mapped.filter((a: any) => !a.deleted && !a.closed);
    return {
      output: { accounts: mapped },
      message: `Found **${activeAccounts.length}** active account(s) (${mapped.length} total)`
    };
  })
  .build();
