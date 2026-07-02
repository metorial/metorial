import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listChartOfAccountsTool = SlateTool.create(spec, {
  name: 'List Chart of Accounts',
  key: 'list_chart_of_accounts',
  description: `List all ledger accounts in the chart of accounts. Useful for finding account IDs to use in bills, expenses, and journal entries.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      showBalance: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include account balances in the response'),
      filterBy: z
        .enum(['AccountType.Active', 'AccountType.Inactive', 'AccountType.All'])
        .optional(),
      searchText: z.string().optional()
    })
  )
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountId: z.string(),
          accountName: z.string().optional(),
          accountCode: z.string().optional(),
          accountType: z.string().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
          currentBalance: z.number().optional(),
          parentAccountId: z.string().optional(),
          parentAccountName: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let query: Record<string, any> = {};
    if (ctx.input.showBalance) query.showbalance = true;
    if (ctx.input.filterBy) query.filter_by = ctx.input.filterBy;
    if (ctx.input.searchText) query.search_text = ctx.input.searchText;

    let resp = await client.listChartOfAccounts(query);
    let accounts = (resp.chartofaccounts || []).map((a: any) => ({
      accountId: a.account_id,
      accountName: a.account_name,
      accountCode: a.account_code,
      accountType: a.account_type,
      description: a.description,
      isActive: a.is_active,
      currentBalance: a.current_balance,
      parentAccountId: a.parent_account_id,
      parentAccountName: a.parent_account_name
    }));

    return {
      output: { accounts },
      message: `Found **${accounts.length}** account(s) in the chart of accounts.`
    };
  })
  .build();

export let createJournalEntryTool = SlateTool.create(spec, {
  name: 'Create Journal Entry',
  key: 'create_journal_entry',
  description: `Create a manual journal entry for accounting adjustments. Each journal must have at least two line items that balance (total debits = total credits).`,
  instructions: [
    'Each journal entry must have balanced debit and credit amounts.',
    'Provide at least two lineItems — one debit and one credit — that sum to zero.'
  ],
  constraints: ['Total debit amounts must equal total credit amounts.']
})
  .input(
    z.object({
      journalDate: z.string().describe('Journal date (YYYY-MM-DD)'),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
      lineItems: z
        .array(
          z.object({
            accountId: z.string().describe('Ledger account ID'),
            debitAmount: z
              .number()
              .optional()
              .describe('Debit amount (provide either debit or credit)'),
            creditAmount: z
              .number()
              .optional()
              .describe('Credit amount (provide either debit or credit)'),
            description: z.string().optional(),
            customerId: z.string().optional().describe('Optional customer for tracking'),
            vendorId: z.string().optional().describe('Optional vendor for tracking')
          })
        )
        .min(2)
        .describe('Journal line items (must balance)')
    })
  )
  .output(
    z.object({
      journalId: z.string(),
      journalDate: z.string().optional(),
      referenceNumber: z.string().optional(),
      total: z.number().optional(),
      entryNumber: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let payload: Record<string, any> = {
      journal_date: input.journalDate,
      line_items: input.lineItems.map(li => ({
        account_id: li.accountId,
        debit_or_credit: li.debitAmount ? 'debit' : 'credit',
        amount: li.debitAmount || li.creditAmount,
        description: li.description,
        customer_id: li.customerId,
        vendor_id: li.vendorId
      }))
    };

    if (input.referenceNumber) payload.reference_number = input.referenceNumber;
    if (input.notes) payload.notes = input.notes;

    let resp = await client.createJournal(payload);
    let journal = resp.journal;

    return {
      output: {
        journalId: journal.journal_id,
        journalDate: journal.journal_date,
        referenceNumber: journal.reference_number,
        total: journal.total,
        entryNumber: journal.entry_number
      },
      message: `Created journal entry **${journal.entry_number}** on ${journal.journal_date} for ${journal.total}.`
    };
  })
  .build();
