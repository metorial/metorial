import { SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';

let transactionSchema = z.object({
  guid: z.string().optional().describe('MX-assigned unique identifier'),
  userGuid: z.string().optional().describe('GUID of the owning user'),
  accountGuid: z.string().optional().nullable().describe('GUID of the account'),
  memberGuid: z.string().optional().nullable().describe('GUID of the member'),
  amount: z.number().optional().nullable().describe('Transaction amount'),
  category: z.string().optional().nullable().describe('MX-categorized category name'),
  categoryGuid: z.string().optional().nullable().describe('Category GUID'),
  description: z.string().optional().nullable().describe('Original transaction description'),
  cleanedDescription: z.string().optional().nullable().describe('MX-cleansed description'),
  date: z.string().optional().nullable().describe('Transaction date (YYYY-MM-DD)'),
  postedAt: z.string().optional().nullable().describe('Posted timestamp'),
  transactedAt: z.string().optional().nullable().describe('Transaction timestamp'),
  type: z.string().optional().nullable().describe('Transaction type (CREDIT or DEBIT)'),
  status: z.string().optional().nullable().describe('Transaction status (POSTED, PENDING)'),
  merchantGuid: z.string().optional().nullable().describe('Merchant GUID'),
  merchantName: z.string().optional().nullable().describe('Merchant name'),
  currencyCode: z.string().optional().nullable().describe('Currency code'),
  isExpense: z
    .boolean()
    .optional()
    .nullable()
    .describe('Whether the transaction is an expense'),
  isIncome: z.boolean().optional().nullable().describe('Whether the transaction is income'),
  memo: z.string().optional().nullable().describe('Transaction memo'),
  checkNumberString: z.string().optional().nullable().describe('Check number if applicable')
});

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `List transactions for a user with optional filtering by account, member, and date range. Transactions include MX-enhanced data such as cleaned descriptions, categories, and merchant information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      accountGuid: z.string().optional().describe('Filter by account GUID'),
      memberGuid: z.string().optional().describe('Filter by member GUID'),
      fromDate: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      toDate: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number'),
      recordsPerPage: z.number().optional().describe('Records per page (max: 100)')
    })
  )
  .output(
    z.object({
      transactions: z.array(transactionSchema),
      pagination: z
        .object({
          currentPage: z.number().optional(),
          perPage: z.number().optional(),
          totalEntries: z.number().optional(),
          totalPages: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });

    let result: any;
    let paginationParams = {
      page: ctx.input.page,
      recordsPerPage: ctx.input.recordsPerPage,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate
    };

    if (ctx.input.accountGuid) {
      result = await client.listTransactionsByAccount(
        ctx.input.userGuid,
        ctx.input.accountGuid,
        paginationParams
      );
    } else if (ctx.input.memberGuid) {
      result = await client.listTransactionsByMember(
        ctx.input.userGuid,
        ctx.input.memberGuid,
        paginationParams
      );
    } else {
      result = await client.listTransactions(ctx.input.userGuid, paginationParams);
    }

    let transactions = (result.transactions || []).map((t: any) => ({
      guid: t.guid,
      userGuid: t.user_guid,
      accountGuid: t.account_guid,
      memberGuid: t.member_guid,
      amount: t.amount,
      category: t.category,
      categoryGuid: t.category_guid,
      description: t.description,
      cleanedDescription: t.cleansed_description,
      date: t.date,
      postedAt: t.posted_at,
      transactedAt: t.transacted_at,
      type: t.type,
      status: t.status,
      merchantGuid: t.merchant_guid,
      merchantName: t.merchant_name ?? t.merchant,
      currencyCode: t.currency_code,
      isExpense: t.is_expense,
      isIncome: t.is_income,
      memo: t.memo,
      checkNumberString: t.check_number_string
    }));

    return {
      output: {
        transactions,
        pagination: result.pagination
          ? {
              currentPage: result.pagination.current_page,
              perPage: result.pagination.per_page,
              totalEntries: result.pagination.total_entries,
              totalPages: result.pagination.total_pages
            }
          : undefined
      },
      message: `Found **${transactions.length}** transactions.`
    };
  })
  .build();

export let readTransaction = SlateTool.create(spec, {
  name: 'Read Transaction',
  key: 'read_transaction',
  description: `Retrieve full details of a specific transaction including amount, category, merchant, cleaned description, and date information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      transactionGuid: z.string().describe('MX GUID of the transaction')
    })
  )
  .output(transactionSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let t = await client.readTransaction(ctx.input.userGuid, ctx.input.transactionGuid);

    return {
      output: {
        guid: t.guid,
        userGuid: t.user_guid,
        accountGuid: t.account_guid,
        memberGuid: t.member_guid,
        amount: t.amount,
        category: t.category,
        categoryGuid: t.category_guid,
        description: t.description,
        cleanedDescription: t.cleansed_description,
        date: t.date,
        postedAt: t.posted_at,
        transactedAt: t.transacted_at,
        type: t.type,
        status: t.status,
        merchantGuid: t.merchant_guid,
        merchantName: t.merchant_name ?? t.merchant,
        currencyCode: t.currency_code,
        isExpense: t.is_expense,
        isIncome: t.is_income,
        memo: t.memo,
        checkNumberString: t.check_number_string
      },
      message: `Transaction **${t.guid}**: ${t.cleansed_description || t.description} — ${t.amount} ${t.currency_code || ''} (${t.date}).`
    };
  })
  .build();
