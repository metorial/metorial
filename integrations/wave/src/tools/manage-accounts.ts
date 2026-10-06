import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import type { Account } from '../lib/contracts';
import { decimalNumber } from '../lib/validation';
import { spec } from '../spec';

let accountOutputSchema = z.object({
  accountId: z.string().describe('Unique identifier of the account'),
  name: z.string().describe('Account name'),
  description: z.string().optional().describe('Account description'),
  displayId: z.string().optional().describe('User-defined display identifier'),
  type: z
    .object({
      name: z.string().optional(),
      normalBalanceType: z.string().optional(),
      value: z.string().optional()
    })
    .optional()
    .describe('Account type (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE)'),
  subtype: z
    .object({
      name: z.string().optional(),
      value: z.string().optional(),
      type: z
        .object({
          name: z.string().optional(),
          value: z.string().optional()
        })
        .optional()
    })
    .optional()
    .describe('Account subtype (e.g., CASH_AND_BANK, ACCOUNTS_RECEIVABLE, CREDIT_CARD)'),
  currency: z
    .object({
      code: z.string().optional(),
      symbol: z.string().optional(),
      name: z.string().optional()
    })
    .optional()
    .describe('Account currency'),
  isArchived: z.boolean().optional().describe('Whether the account is archived'),
  sequence: z
    .number()
    .optional()
    .describe('Account revision sequence used for concurrency control'),
  balance: z.number().optional().describe('Current balance'),
  balanceInBusinessCurrency: z
    .number()
    .optional()
    .describe('Balance in business default currency'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

let mapAccount = (a: Account) => ({
  accountId: a.id,
  name: a.name,
  description: a.description,
  displayId: a.displayId,
  type: a.type,
  subtype: a.subtype,
  currency: a.currency,
  isArchived: a.isArchived,
  sequence: a.sequence,
  balance: decimalNumber(a.balance),
  balanceInBusinessCurrency: decimalNumber(a.balanceInBusinessCurrency),
  createdAt: undefined,
  modifiedAt: undefined
});

// --- List Accounts ---

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List accounts in a business's chart of accounts. Returns all account types including assets, liabilities, equity, income, and expenses with their current balances.`,
  tags: {
    readOnly: true
  }
})
  .scopes(anyOf('account:read'))
  .input(
    z.object({
      businessId: z
        .string()
        .describe(
          'ID of the business to list accounts for. Call list_businesses to discover a permitted business ID.'
        ),
      page: z.number().optional().describe('Page number (starts at 1, default: 1)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountOutputSchema).describe('List of accounts'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.listAccounts(
      ctx.input.businessId,
      ctx.input.page ?? 1,
      ctx.input.pageSize ?? 20
    );

    return {
      output: {
        accounts: result.items.map(mapAccount),
        currentPage: result.pageInfo.currentPage,
        totalPages: result.pageInfo.totalPages,
        totalCount: result.pageInfo.totalCount
      },
      message: `Found **${result.pageInfo.totalCount}** accounts (page ${result.pageInfo.currentPage} of ${result.pageInfo.totalPages}).`
    };
  })
  .build();

// --- Create Account ---

export let createAccount = SlateTool.create(spec, {
  name: 'Create Account',
  key: 'create_account',
  tags: { readOnly: false },
  description: `Create a new account in a business's chart of accounts. Specify the account name and subtype. Account subtypes determine the account's type (Asset, Liability, Equity, Income, Expense).`,
  instructions: [
    'Common supported subtype values include CASH_AND_BANK, CREDIT_CARD, INCOME, OTHER_INCOME, COST_OF_GOODS_SOLD, EXPENSE and RECEIVABLE. Refer to Wave AccountSubtypeValueCreateInput for the full list.'
  ]
})
  .scopes(anyOf('account:write'))
  .input(
    z.object({
      businessId: z
        .string()
        .describe(
          'ID of the business to create the account for. Call list_businesses to discover a permitted business ID.'
        ),
      name: z.string().describe('Account name'),
      subtype: z.string().describe('Account subtype value (determines the account type)'),
      description: z.string().optional().describe('Account description'),
      currency: z.string().optional().describe('ISO 4217 currency code'),
      displayId: z.string().optional().describe('Custom display identifier')
    })
  )
  .output(accountOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.createAccount(ctx.input);

    return {
      output: mapAccount(result.data),
      message: `Created account **${result.data.name}** (${result.data.id}).`
    };
  })
  .build();

// --- Update Account ---

export let updateAccount = SlateTool.create(spec, {
  name: 'Update Account',
  key: 'update_account',
  tags: { readOnly: false },
  description: `Update an existing account's details. Only the fields you provide will be updated; omitted fields remain unchanged.`
})
  .scopes(anyOf('account:write'))
  .input(
    z.object({
      accountId: z.string().describe('ID of the account to update'),
      businessId: z
        .string()
        .optional()
        .describe(
          'Business ID used to read the current revision when sequence is omitted. Call list_businesses.'
        ),
      sequence: z
        .number()
        .optional()
        .describe(
          'Current revision from list_accounts or get_resource. Supply this or businessId; stale revisions are not retried.'
        ),
      name: z.string().optional().describe('Updated account name'),
      description: z.string().optional().describe('Updated description'),
      currency: z
        .string()
        .optional()
        .describe('Legacy field unsupported by account updates; omit it.'),
      displayId: z.string().optional().describe('Updated display identifier'),
      subtype: z
        .string()
        .optional()
        .describe('Legacy field unsupported by account updates; omit it.')
    })
  )
  .output(accountOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let { accountId, ...rest } = ctx.input;
    let result = await client.patchAccount({ id: accountId, ...rest });

    return {
      output: mapAccount(result.data),
      message: `Updated account **${result.data.name}** (${result.data.id}).`
    };
  })
  .build();

// --- Archive Account ---

export let archiveAccount = SlateTool.create(spec, {
  name: 'Archive Account',
  key: 'archive_account',
  tags: { readOnly: false, destructive: true },
  description: `Archive an account in the chart of accounts. Archived accounts are hidden from the active chart of accounts but are not deleted. Accounts cannot be permanently deleted in Wave.`
})
  .scopes(anyOf('account:write'))
  .input(
    z.object({
      accountId: z.string().describe('ID of the account to archive')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the archival was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    await client.archiveAccount(ctx.input.accountId);

    return {
      output: { success: true },
      message: `Archived account \`${ctx.input.accountId}\`.`
    };
  })
  .build();
