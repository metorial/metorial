import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let accountOutputSchema = z.object({
  accountId: z.string().describe('Account ID'),
  name: z.string().describe('Account name'),
  accountType: z.string().describe('Account type (e.g., Income, Expense, Bank, etc.)'),
  accountSubType: z.string().optional().describe('Account sub-type'),
  accountNumber: z.string().optional().describe('Account number'),
  currentBalance: z.number().optional().describe('Current balance'),
  active: z.boolean().optional().describe('Whether the account is active'),
  classification: z
    .string()
    .optional()
    .describe('Account classification (Asset, Liability, Equity, Revenue, Expense)'),
  syncToken: z.string().describe('Sync token for updates')
});

export let createAccount = SlateTool.create(spec, {
  name: 'Create Account',
  key: 'create_account',
  description: `Creates a new account in the QuickBooks chart of accounts. Accounts track income, expenses, assets, liabilities, and equity. Supports sub-account hierarchy.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Account name'),
      accountType: z
        .enum([
          'Bank',
          'Other Current Asset',
          'Fixed Asset',
          'Other Asset',
          'Accounts Receivable',
          'Equity',
          'Expense',
          'Other Expense',
          'Cost of Goods Sold',
          'Accounts Payable',
          'Credit Card',
          'Long Term Liability',
          'Other Current Liability',
          'Income',
          'Other Income'
        ])
        .describe('Account type'),
      accountSubType: z
        .string()
        .optional()
        .describe('Account sub-type (e.g., Checking, Savings, etc.)'),
      accountNumber: z.string().optional().describe('Account number'),
      description: z.string().optional().describe('Account description'),
      parentAccountId: z
        .string()
        .optional()
        .describe('Parent account ID for sub-account hierarchy')
    })
  )
  .output(accountOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let accountData: any = {
      Name: ctx.input.name,
      AccountType: ctx.input.accountType
    };

    if (ctx.input.accountSubType) accountData.AccountSubType = ctx.input.accountSubType;
    if (ctx.input.accountNumber) accountData.AcctNum = ctx.input.accountNumber;
    if (ctx.input.description) accountData.Description = ctx.input.description;
    if (ctx.input.parentAccountId) {
      accountData.SubAccount = true;
      accountData.ParentRef = { value: ctx.input.parentAccountId };
    }

    let account = await client.createAccount(accountData);

    return {
      output: {
        accountId: account.Id,
        name: account.Name,
        accountType: account.AccountType,
        accountSubType: account.AccountSubType,
        accountNumber: account.AcctNum,
        currentBalance: account.CurrentBalance,
        active: account.Active,
        classification: account.Classification,
        syncToken: account.SyncToken
      },
      message: `Created ${account.AccountType} account **${account.Name}**${account.AcctNum ? ` (#${account.AcctNum})` : ''} (ID: ${account.Id}).`
    };
  })
  .build();

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieves an account from the chart of accounts by ID, returning type, balance, and classification details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('QuickBooks Account ID')
    })
  )
  .output(accountOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let account = await client.getAccount(ctx.input.accountId);

    return {
      output: {
        accountId: account.Id,
        name: account.Name,
        accountType: account.AccountType,
        accountSubType: account.AccountSubType,
        accountNumber: account.AcctNum,
        currentBalance: account.CurrentBalance,
        active: account.Active,
        classification: account.Classification,
        syncToken: account.SyncToken
      },
      message: `Retrieved account **${account.Name}** (${account.AccountType}, balance: $${account.CurrentBalance ?? 0}).`
    };
  })
  .build();
