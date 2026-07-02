import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let accountOutputSchema = z.object({
  accountId: z.string().optional().describe('Unique Xero account ID'),
  code: z.string().optional().describe('Account code'),
  name: z.string().optional().describe('Account name'),
  type: z
    .string()
    .optional()
    .describe(
      'Account type: BANK, CURRENT, CURRLIAB, DEPRECIATN, DIRECTCOSTS, EQUITY, EXPENSE, FIXED, INVENTORY, LIABILITY, NONCURRENT, OTHERINCOME, OVERHEADS, PREPAYMENT, REVENUE, SALES, TERMLIAB, PAYGLIABILITY, SUPERANNUATIONEXPENSE, SUPERANNUATIONLIABILITY, WAGESEXPENSE'
    ),
  status: z.string().optional().describe('ACTIVE or ARCHIVED'),
  description: z.string().optional().describe('Account description'),
  taxType: z.string().optional().describe('Default tax type for the account'),
  enablePaymentsToAccount: z
    .boolean()
    .optional()
    .describe('Whether payments can be made to this account'),
  showInExpenseClaims: z
    .boolean()
    .optional()
    .describe('Whether account appears in expense claims'),
  class: z
    .string()
    .optional()
    .describe('Account class: ASSET, EQUITY, EXPENSE, LIABILITY, REVENUE'),
  systemAccount: z.string().optional().describe('System account type if applicable'),
  bankAccountType: z.string().optional().describe('Bank account type if applicable'),
  currencyCode: z.string().optional().describe('Currency code for bank accounts'),
  reportingCode: z.string().optional().describe('Reporting code'),
  updatedDate: z.string().optional().describe('Last updated timestamp')
});

let mapAccount = (a: any) => ({
  accountId: a.AccountID,
  code: a.Code,
  name: a.Name,
  type: a.Type,
  status: a.Status,
  description: a.Description,
  taxType: a.TaxType,
  enablePaymentsToAccount: a.EnablePaymentsToAccount,
  showInExpenseClaims: a.ShowInExpenseClaims,
  class: a.Class,
  systemAccount: a.SystemAccount,
  bankAccountType: a.BankAccountType,
  currencyCode: a.CurrencyCode,
  reportingCode: a.ReportingCode,
  updatedDate: a.UpdatedDateUTC
});

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `Lists all accounts in the chart of accounts. Supports filtering by account type, class, or status using the where parameter. Useful for finding account codes to use in invoices, payments, and journal entries.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      where: z
        .string()
        .optional()
        .describe('Xero API where filter, e.g. `Type=="BANK"` or `Class=="REVENUE"`'),
      order: z.string().optional().describe('Order results, e.g. "Code ASC"'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return accounts modified after this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountOutputSchema).describe('List of accounts'),
      count: z.number().describe('Number of accounts returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let result = await client.getAccounts({
      where: ctx.input.where,
      order: ctx.input.order,
      modifiedAfter: ctx.input.modifiedAfter
    });

    let accounts = (result.Accounts || []).map(mapAccount);

    return {
      output: { accounts, count: accounts.length },
      message: `Found **${accounts.length}** account(s) in the chart of accounts.`
    };
  })
  .build();

export let createAccount = SlateTool.create(spec, {
  name: 'Create Account',
  key: 'create_account',
  description: `Creates a new account in the chart of accounts. Requires a code, name, and type. Bank accounts also require a bank account number.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      code: z.string().describe('Unique account code'),
      name: z.string().describe('Account name'),
      type: z
        .string()
        .describe(
          'Account type: BANK, CURRENT, CURRLIAB, DEPRECIATN, DIRECTCOSTS, EQUITY, EXPENSE, FIXED, INVENTORY, LIABILITY, NONCURRENT, OTHERINCOME, OVERHEADS, PREPAYMENT, REVENUE, SALES, TERMLIAB'
        ),
      description: z.string().optional().describe('Account description'),
      taxType: z.string().optional().describe('Default tax type'),
      enablePaymentsToAccount: z
        .boolean()
        .optional()
        .describe('Enable payments to this account'),
      showInExpenseClaims: z.boolean().optional().describe('Show in expense claims'),
      bankAccountNumber: z
        .string()
        .optional()
        .describe('Bank account number (required for BANK type)'),
      currencyCode: z.string().optional().describe('Currency code (for bank accounts)')
    })
  )
  .output(accountOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let account = await client.createAccount({
      Code: ctx.input.code,
      Name: ctx.input.name,
      Type: ctx.input.type,
      Description: ctx.input.description,
      TaxType: ctx.input.taxType,
      EnablePaymentsToAccount: ctx.input.enablePaymentsToAccount,
      ShowInExpenseClaims: ctx.input.showInExpenseClaims,
      BankAccountNumber: ctx.input.bankAccountNumber,
      CurrencyCode: ctx.input.currencyCode
    });

    let output = mapAccount(account);

    return {
      output,
      message: `Created account **${output.code} — ${output.name}** (${output.type}).`
    };
  })
  .build();

export let updateAccount = SlateTool.create(spec, {
  name: 'Update Account',
  key: 'update_account',
  description: `Updates an existing account in the chart of accounts. Can modify name, description, tax type, and other settings. Can also archive an account by setting status to ARCHIVED.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      accountId: z.string().describe('The Xero account ID to update'),
      name: z.string().optional().describe('Updated account name'),
      code: z.string().optional().describe('Updated account code'),
      description: z.string().optional().describe('Updated description'),
      taxType: z.string().optional().describe('Updated default tax type'),
      status: z.enum(['ACTIVE', 'ARCHIVED']).optional().describe('Set account status'),
      enablePaymentsToAccount: z
        .boolean()
        .optional()
        .describe('Enable payments to this account'),
      showInExpenseClaims: z.boolean().optional().describe('Show in expense claims')
    })
  )
  .output(accountOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let updateData: Record<string, any> = {};
    if (ctx.input.name) updateData.Name = ctx.input.name;
    if (ctx.input.code) updateData.Code = ctx.input.code;
    if (ctx.input.description) updateData.Description = ctx.input.description;
    if (ctx.input.taxType) updateData.TaxType = ctx.input.taxType;
    if (ctx.input.status) updateData.Status = ctx.input.status;
    if (ctx.input.enablePaymentsToAccount !== undefined)
      updateData.EnablePaymentsToAccount = ctx.input.enablePaymentsToAccount;
    if (ctx.input.showInExpenseClaims !== undefined)
      updateData.ShowInExpenseClaims = ctx.input.showInExpenseClaims;

    let account = await client.updateAccount(ctx.input.accountId, updateData);
    let output = mapAccount(account);

    return {
      output,
      message: `Updated account **${output.code} — ${output.name}**${ctx.input.status ? ` — Status: **${ctx.input.status}**` : ''}.`
    };
  })
  .build();
