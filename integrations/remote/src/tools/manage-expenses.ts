import { z } from 'zod';
import { collection, pageOutput, pageParams, single } from '../lib/client';
import { remoteTool } from '../lib/tool';
import {
  country,
  currency,
  date,
  fail,
  id,
  integer,
  pageSchema,
  pageSizeSchema,
  paginationOutput,
  recordSchema,
  rejectFields,
  required,
  timestamp
} from '../lib/validation';
export let manageExpenses = remoteTool(
  {
    name: 'Manage Expenses',
    key: 'manage_expenses',
    description:
      'Read expenses and categories, create an already-approved expense, or approve/decline a pending expense. Current update changes review status only; it does not edit expense amounts or reimburse funds directly.',
    tags: { destructive: true }
  },
  z.object({
    action: z.enum(['create', 'update', 'get', 'list', 'list_categories']),
    expenseId: z.string().optional(),
    employmentId: z.string().optional(),
    title: z.string().optional(),
    amount: z
      .number()
      .optional()
      .describe(
        'Integer hundredths of the expense currency (10000 means 100.00). Creation only.'
      ),
    currency: z.string().optional(),
    category: z.string().optional(),
    expenseDate: z.string().optional(),
    receiptBase64: z.string().optional(),
    receiptFileName: z.string().optional(),
    taxAmount: z
      .number()
      .optional()
      .describe('Integer hundredths, without conversion. Creation only.'),
    reviewedAt: z
      .string()
      .optional()
      .describe(
        'Optional ISO review timestamp for creation; current update accepts review status only.'
      ),
    status: z
      .string()
      .optional()
      .describe('Legacy list filter; the current list endpoint does not document it.'),
    page: pageSchema,
    pageSize: pageSizeSchema,
    expenseCategorySlug: z.string().optional(),
    countryCode: z.string().optional(),
    includeParents: z.boolean().optional(),
    timezone: z.string().optional(),
    reviewerId: z.string().optional(),
    reviewStatus: z.enum(['approved', 'declined']).optional(),
    reviewReason: z.string().optional(),
    receipts: z
      .array(z.object({ name: z.string(), content: z.string() }))
      .optional()
      .describe(
        'Up to five Base64 receipts for creation; use this or the legacy single receipt fields.'
      )
  }),
  z.object({
    expense: recordSchema.optional(),
    expenses: z.array(recordSchema).optional(),
    categories: z.array(recordSchema).optional(),
    ...paginationOutput
  }),
  async (client, input) => {
    if (input.action === 'list') {
      rejectFields(
        input,
        ['employmentId', 'status'],
        'The current expense list does not document employmentId or status filters. Omit them and inspect the returned page; these filters must not be silently ignored.'
      );
      let value = await client.get('/expenses', pageParams(input));
      return {
        output: { expenses: collection(value, 'expenses'), ...pageOutput(value) },
        message: 'Retrieved an expense page.'
      };
    }
    if (input.action === 'get')
      return {
        output: { expense: await client.entity('/expenses', 'expense', input.expenseId) },
        message: 'Retrieved the current expense.'
      };
    if (input.action === 'list_categories') {
      if (!input.employmentId && !input.expenseId && !input.countryCode)
        fail('Category discovery requires employmentId, expenseId, or countryCode.');
      let value = await client.get('/expenses/categories', {
        employment_id: input.employmentId === undefined ? undefined : id(input.employmentId),
        expense_id: input.expenseId === undefined ? undefined : id(input.expenseId),
        country_code: input.countryCode === undefined ? undefined : country(input.countryCode),
        include_parents: input.includeParents
      });
      return {
        output: { categories: collection(value, 'expense_categories') },
        message: 'Retrieved effective expense categories.'
      };
    }
    if (input.action === 'update') {
      rejectFields(
        input,
        [
          'title',
          'amount',
          'currency',
          'category',
          'taxAmount',
          'reviewedAt',
          'expenseDate',
          'receiptBase64',
          'receiptFileName',
          'receipts',
          'expenseCategorySlug',
          'status'
        ],
        'Current expense updates only approve or decline pending expenses. Use reviewStatus and reviewReason; amounts, receipts, and categories cannot be edited by this endpoint.'
      );
      let expenseId = id(input.expenseId, 'Expense ID');
      if (!input.reviewStatus)
        fail('Expense update requires reviewStatus: approved or declined.');
      let current = await client.entity('/expenses', 'expense', expenseId);
      if (current.status !== 'pending')
        fail(
          'Only pending expenses can be approved or declined. Read the current expense before retrying.'
        );
      let value = await client.patch(`/expenses/${expenseId}`, {
        status: input.reviewStatus,
        reason:
          input.reviewStatus === 'declined'
            ? required(input.reviewReason, 'Decline reason')
            : undefined
      });
      return {
        output: { expense: single(value, 'expense', expenseId) },
        message: 'Remote accepted the expense review. This is not a fund-transfer receipt.'
      };
    }
    let employmentId = id(input.employmentId, 'Employment ID');
    await client.employment(employmentId);
    let purchaseDate = date(input.expenseDate, 'Expense date');
    if (purchaseDate > new Date().toISOString().slice(0, 10))
      fail('Expense date must not be in the future.');
    if (
      input.receipts &&
      (input.receiptBase64 !== undefined || input.receiptFileName !== undefined)
    )
      fail('Use receipts or the legacy single receipt fields, not both.');
    let receipts =
      input.receipts ??
      (input.receiptBase64 === undefined
        ? undefined
        : [
            {
              content: input.receiptBase64,
              name: required(input.receiptFileName, 'Receipt file name')
            }
          ]);
    if (receipts && (!receipts.length || receipts.length > 5))
      fail('Provide between one and five receipts.');
    if (input.receiptFileName !== undefined && input.receiptBase64 === undefined)
      fail('receiptFileName requires receiptBase64.');
    for (let receipt of receipts ?? []) {
      required(receipt.name, 'Receipt name');
      if (
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          required(receipt.content, 'Receipt Base64')
        ) ||
        Buffer.from(receipt.content, 'base64').toString('base64') !== receipt.content
      )
        fail('Receipt content must be canonical Base64.');
    }
    let value = await client.post('/expenses', {
      employment_id: employmentId,
      title: required(input.title, 'Expense title'),
      amount: integer(input.amount, 'Expense amount'),
      currency: currency(input.currency),
      category: input.category,
      expense_category_slug: input.expenseCategorySlug,
      expense_date: purchaseDate,
      tax_amount:
        input.taxAmount === undefined ? undefined : integer(input.taxAmount, 'Tax amount'),
      reviewed_at:
        input.reviewedAt === undefined
          ? undefined
          : timestamp(input.reviewedAt, 'Review timestamp'),
      reviewer_id: input.reviewerId === undefined ? undefined : id(input.reviewerId),
      timezone: input.timezone,
      receipts
    });
    return {
      output: { expense: single(value, 'expense') },
      message:
        'Remote created an already-approved expense. The expense may enter reimbursement processing; no transfer completion is asserted.'
    };
  }
);
