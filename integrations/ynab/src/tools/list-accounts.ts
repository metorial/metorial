import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapAccount } from '../lib/models';
import { budgetInput, deltaInput, milliunits } from '../lib/validation';
import { spec } from '../spec';

let accountSchema = z.object({
  accountId: z.string().describe('Unique identifier for the account'),
  name: z.string().describe('Account name'),
  type: z.string().describe('Account type (checking, savings, creditCard, etc.)'),
  onBudget: z.boolean().describe('Whether the account is on-budget'),
  closed: z.boolean().describe('Whether the account is closed'),
  balance: milliunits.describe('Current balance in milliunits'),
  clearedBalance: milliunits.describe('Cleared balance in milliunits'),
  unclearedBalance: milliunits.describe('Uncleared balance in milliunits'),
  note: z.string().nullable().optional().describe('Account note'),
  directImportLinked: z
    .boolean()
    .optional()
    .describe('Whether a linked bank import is set up'),
  directImportInError: z
    .boolean()
    .optional()
    .describe('Whether the linked import is in an error state'),
  transferPayeeId: z
    .string()
    .nullable()
    .optional()
    .describe('Use this payee ID to transfer into this account.'),
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
      lastKnowledgeOfServer: deltaInput,
      budgetId: budgetInput
    })
  )
  .output(
    z.object({
      serverKnowledge: milliunits
        .nonnegative()
        .optional()
        .describe('Knowledge returned by this endpoint for subsequent delta requests.'),
      accounts: z.array(accountSchema).describe('List of accounts')
    })
  )
  .handleInvocation(async ctx => {
    const data = await new Client({ token: ctx.auth.token }).getAccounts(
      ctx.input.budgetId ?? ctx.config.budgetId,
      ctx.input.lastKnowledgeOfServer
    );
    return {
      output: {
        accounts: data.accounts.map(mapAccount),
        serverKnowledge: data.serverKnowledge
      },
      message: `Returned ${data.accounts.length} account record(s), including deletion tombstones for delta requests.`
    };
  })
  .build();
