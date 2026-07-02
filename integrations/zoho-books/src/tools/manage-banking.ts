import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listBankAccountsTool = SlateTool.create(spec, {
  name: 'List Bank Accounts',
  key: 'list_bank_accounts',
  description: `List all bank and credit card accounts configured in Zoho Books.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      filterBy: z
        .enum([
          'Status.All',
          'Status.Active',
          'Status.Inactive',
          'AccountType.Bank',
          'AccountType.CreditCard'
        ])
        .optional()
    })
  )
  .output(
    z.object({
      bankAccounts: z.array(
        z.object({
          accountId: z.string(),
          accountName: z.string().optional(),
          accountType: z.string().optional(),
          bankName: z.string().optional(),
          accountNumber: z.string().optional(),
          currencyCode: z.string().optional(),
          balance: z.number().optional(),
          bankBalance: z.number().optional(),
          isActive: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let query: Record<string, any> = {};
    if (ctx.input.filterBy) query.filter_by = ctx.input.filterBy;

    let resp = await client.listBankAccounts(query);
    let bankAccounts = (resp.bankaccounts || []).map((a: any) => ({
      accountId: a.account_id,
      accountName: a.account_name,
      accountType: a.account_type,
      bankName: a.bank_name,
      accountNumber: a.account_number,
      currencyCode: a.currency_code,
      balance: a.balance,
      bankBalance: a.bank_balance,
      isActive: a.is_active
    }));

    return {
      output: { bankAccounts },
      message: `Found **${bankAccounts.length}** bank account(s).`
    };
  })
  .build();

export let listBankTransactionsTool = SlateTool.create(spec, {
  name: 'List Bank Transactions',
  key: 'list_bank_transactions',
  description: `List bank transactions for a specific account with filtering by status, date, and type.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountId: z.string().describe('Bank account ID'),
      dateFrom: z.string().optional().describe('From date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('To date (YYYY-MM-DD)'),
      status: z
        .enum(['manually_added', 'matched', 'uncategorized', 'categorized', 'excluded'])
        .optional(),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(200)
    })
  )
  .output(
    z.object({
      transactions: z.array(
        z.object({
          transactionId: z.string(),
          date: z.string().optional(),
          amount: z.number().optional(),
          transactionType: z.string().optional(),
          status: z.string().optional(),
          referenceNumber: z.string().optional(),
          description: z.string().optional(),
          debitOrCredit: z.string().optional(),
          accountName: z.string().optional()
        })
      ),
      pageContext: z
        .object({
          page: z.number(),
          perPage: z.number(),
          hasMorePage: z.boolean()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let query: Record<string, any> = {
      account_id: ctx.input.accountId,
      page: ctx.input.page,
      per_page: ctx.input.perPage
    };
    if (ctx.input.dateFrom) query.date_start = ctx.input.dateFrom;
    if (ctx.input.dateTo) query.date_end = ctx.input.dateTo;
    if (ctx.input.status) query.status = ctx.input.status;

    let resp = await client.listBankTransactions(query);
    let transactions = (resp.banktransactions || []).map((t: any) => ({
      transactionId: t.transaction_id,
      date: t.date,
      amount: t.amount,
      transactionType: t.transaction_type,
      status: t.status,
      referenceNumber: t.reference_number,
      description: t.description,
      debitOrCredit: t.debit_or_credit,
      accountName: t.account_name
    }));

    let pageContext = resp.page_context
      ? {
          page: resp.page_context.page,
          perPage: resp.page_context.per_page,
          hasMorePage: resp.page_context.has_more_page
        }
      : undefined;

    return {
      output: { transactions, pageContext },
      message: `Found **${transactions.length}** bank transaction(s).`
    };
  })
  .build();
