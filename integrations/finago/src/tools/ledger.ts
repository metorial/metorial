import { SlateTool } from 'slates';
import { z } from 'zod';
import { finagoServiceError } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import { mergeAdditionalFields, objectWithDefined } from '../lib/records';
import { spec } from '../spec';
import { additionalFieldsSchema, maxPagesSchema } from './shared';

let transactionCommentMaxLength = 75;
let invoiceNumberMaxLength = 50;
let invoiceRemittanceReferenceMaxLength = 32;
let invoiceBankAccountMaxLength = 50;
let transactionCurrencyCodePattern = /^[A-Z]{3}$/;

let transactionLineDimensionsSchema = z
  .array(
    z.object({
      dimensionType: z.number().int().describe('Finago dimension type ID.'),
      value: z.string().describe('Dimension element value/key.')
    })
  )
  .max(10)
  .optional()
  .describe('Optional dimensions for the entry. Each dimension must match a predefined key.');

let transactionLineInputSchema = z.object({
  accountNumber: z.number().int().positive().describe('General ledger account number.'),
  amount: z
    .number()
    .describe('Line amount. Positive for debit, negative for credit. Lines must balance.'),
  taxNumber: z.number().int().min(0).describe('Tax code number. Use 0 for no tax.'),
  taxAmount: z.number().optional().describe('Explicit tax amount, if needed.'),
  taxBaseRate: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Tax base rate for partial deduction, between 0 and 100.'),
  taxSpecificationNumber: z.number().int().optional().describe('Tax specification number.'),
  comment: z
    .string()
    .max(transactionCommentMaxLength)
    .optional()
    .describe('Line comment. Defaults to the transaction comment when omitted.'),
  date: z.string().optional().describe('Line date in YYYY-MM-DD format.'),
  periodDate: z.string().optional().describe('Tax period date in YYYY-MM-DD format.'),
  currencyCode: z
    .string()
    .regex(transactionCurrencyCodePattern)
    .optional()
    .describe('ISO 4217 currency code for the line, such as USD.'),
  currencyRate: z
    .number()
    .positive()
    .optional()
    .describe('Exchange rate to system base currency.'),
  dimensions: transactionLineDimensionsSchema,
  invoiceNumber: z
    .string()
    .max(invoiceNumberMaxLength)
    .optional()
    .describe('Related invoice number.'),
  invoiceDueDate: z
    .string()
    .optional()
    .describe('Related invoice due date in YYYY-MM-DD format.'),
  invoiceRemittanceReference: z
    .string()
    .max(invoiceRemittanceReferenceMaxLength)
    .optional()
    .describe('Related remittance reference.'),
  invoiceBankAccount: z
    .string()
    .max(invoiceBankAccountMaxLength)
    .optional()
    .describe('Related invoice bank account.')
});

let buildTransactionLine = (line: z.infer<typeof transactionLineInputSchema>) => {
  if (
    (line.currencyCode === undefined && line.currencyRate !== undefined) ||
    (line.currencyCode !== undefined && line.currencyRate === undefined)
  ) {
    throw finagoServiceError(
      'currencyCode and currencyRate must be provided together for transaction lines.'
    );
  }

  let body: Record<string, unknown> = {
    accountNumber: line.accountNumber,
    amount: line.amount,
    tax: objectWithDefined({
      number: line.taxNumber,
      amount: line.taxAmount,
      baseRate: line.taxBaseRate,
      specificationNumber: line.taxSpecificationNumber
    })
  };

  if (line.comment !== undefined) body.comment = line.comment;
  if (line.date !== undefined) body.date = line.date;
  if (line.periodDate !== undefined) body.periodDate = line.periodDate;
  if (line.dimensions !== undefined) body.dimensions = line.dimensions;
  if (line.currencyCode !== undefined || line.currencyRate !== undefined) {
    body.currency = objectWithDefined({ code: line.currencyCode, rate: line.currencyRate });
  }
  if (
    line.invoiceNumber !== undefined ||
    line.invoiceDueDate !== undefined ||
    line.invoiceRemittanceReference !== undefined ||
    line.invoiceBankAccount !== undefined
  ) {
    body.invoice = objectWithDefined({
      number: line.invoiceNumber,
      dueDate: line.invoiceDueDate,
      remittanceReference: line.invoiceRemittanceReference,
      bankAccount: line.invoiceBankAccount
    });
  }

  return body;
};

let dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
let uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let isValidDateOnly = (value: string) => {
  if (!dateOnlyPattern.test(value)) return false;

  let date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

let requireDateOnly = (value: string, label: string) => {
  if (!isValidDateOnly(value)) {
    throw finagoServiceError(`${label} must be a valid date in YYYY-MM-DD format.`);
  }
};

let requireIsoDateTime = (value: string | undefined, label: string) => {
  if (value === undefined) return;

  if (
    !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
    !isValidDateOnly(value.slice(0, 10)) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw finagoServiceError(`${label} must be a valid ISO 8601 date-time.`);
  }
};

let requireUuid = (value: string | undefined, label: string) => {
  if (value === undefined) return;

  if (!uuidPattern.test(value)) {
    throw finagoServiceError(`${label} must be a valid UUID.`);
  }
};

let requireOptionalDateOnly = (value: string | undefined, label: string) => {
  if (value !== undefined) {
    requireDateOnly(value, label);
  }
};

let requireMaxLength = (value: string | undefined, label: string, maxLength: number) => {
  if (value !== undefined && value.length > maxLength) {
    throw finagoServiceError(`${label} must be at most ${maxLength} characters.`);
  }
};

let rejectAdditionalFields = (
  additionalFields: Record<string, unknown> | undefined,
  keys: string[],
  context: string
) => {
  let conflicts = keys.filter(key =>
    Object.prototype.hasOwnProperty.call(additionalFields ?? {}, key)
  );

  if (conflicts.length > 0) {
    throw finagoServiceError(
      `${conflicts.join(', ')} cannot be supplied in additionalFields when ${context}.`
    );
  }
};

let validateTransactionLineListInput = (input: {
  dateFrom: string;
  dateTo: string;
  createdFrom?: string;
  modifiedFrom?: string;
  transactionId?: string;
}) => {
  requireDateOnly(input.dateFrom, 'dateFrom');
  requireDateOnly(input.dateTo, 'dateTo');

  if (input.dateTo <= input.dateFrom) {
    throw finagoServiceError(
      'dateTo must be later than dateFrom because Finago treats dateTo as exclusive.'
    );
  }

  requireIsoDateTime(input.createdFrom, 'createdFrom');
  requireIsoDateTime(input.modifiedFrom, 'modifiedFrom');
  requireUuid(input.transactionId, 'transactionId');
};

let accountBalancePeriodsPattern = /^\d{4}-\d{2}-\d{2}Z?(,\d{4}-\d{2}-\d{2}Z?)*$/;

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let validateAccountBalancePeriods = (periods: string | undefined) => {
  if (periods === undefined) return;

  let periodValues = periods.split(',');
  let hasInvalidPeriod =
    !accountBalancePeriodsPattern.test(periods) ||
    periodValues.some(period => {
      let date = period.endsWith('Z') ? period.slice(0, -1) : period;
      return !isValidDateOnly(date);
    });

  if (hasInvalidPeriod) {
    throw finagoServiceError(
      'periods must be a comma-separated list of valid dates in YYYY-MM-DD format, with an optional trailing Z on each date.'
    );
  }
};

let validateAccountBalanceInput = (input: {
  dateFrom: string;
  dateTo: string;
  periods?: string;
}) => {
  requireDateOnly(input.dateFrom, 'dateFrom');
  requireDateOnly(input.dateTo, 'dateTo');

  if (input.dateTo < input.dateFrom) {
    throw finagoServiceError('dateTo must be the same as or later than dateFrom.');
  }

  validateAccountBalancePeriods(input.periods);
};

type AccountBalanceResponse = {
  balances: unknown[];
  beginningAt?: string;
  endingAt?: string;
  fiscals?: unknown[];
};

let normalizeAccountBalanceResponse = (data: unknown): AccountBalanceResponse => {
  if (Array.isArray(data)) {
    return { balances: data };
  }

  if (!isRecord(data)) {
    return { balances: [] };
  }

  let embedded = data._embedded;
  let balances = isRecord(embedded) && Array.isArray(embedded.records) ? embedded.records : [];

  return {
    balances,
    beginningAt: typeof data.beginningAt === 'string' ? data.beginningAt : undefined,
    endingAt: typeof data.endingAt === 'string' ? data.endingAt : undefined,
    fiscals: Array.isArray(data.fiscals) ? data.fiscals : undefined
  };
};

type PostTransactionInput = {
  confirm: boolean;
  transactionTypeNumber: number;
  date: string;
  comment?: string;
  documentId?: number;
  lines: z.infer<typeof transactionLineInputSchema>[];
  additionalFields?: Record<string, unknown>;
};

let validateTransactionLine = (
  line: z.infer<typeof transactionLineInputSchema>,
  index: number
) => {
  let label = `lines[${index}]`;

  requireMaxLength(line.comment, `${label}.comment`, transactionCommentMaxLength);
  requireOptionalDateOnly(line.date, `${label}.date`);
  requireOptionalDateOnly(line.periodDate, `${label}.periodDate`);
  requireOptionalDateOnly(line.invoiceDueDate, `${label}.invoiceDueDate`);
  requireMaxLength(line.invoiceNumber, `${label}.invoiceNumber`, invoiceNumberMaxLength);
  requireMaxLength(
    line.invoiceRemittanceReference,
    `${label}.invoiceRemittanceReference`,
    invoiceRemittanceReferenceMaxLength
  );
  requireMaxLength(
    line.invoiceBankAccount,
    `${label}.invoiceBankAccount`,
    invoiceBankAccountMaxLength
  );

  if (
    (line.currencyCode === undefined && line.currencyRate !== undefined) ||
    (line.currencyCode !== undefined && line.currencyRate === undefined)
  ) {
    throw finagoServiceError(
      `lines[${index}].currencyCode and lines[${index}].currencyRate must be provided together.`
    );
  }
  if (
    line.currencyCode !== undefined &&
    !transactionCurrencyCodePattern.test(line.currencyCode)
  ) {
    throw finagoServiceError(`${label}.currencyCode must be a three-letter ISO 4217 code.`);
  }
  if (line.currencyRate !== undefined && line.currencyRate <= 0) {
    throw finagoServiceError(`${label}.currencyRate must be greater than 0.`);
  }
  if (line.taxBaseRate !== undefined && (line.taxBaseRate < 0 || line.taxBaseRate > 100)) {
    throw finagoServiceError(`${label}.taxBaseRate must be between 0 and 100.`);
  }
  if (line.dimensions !== undefined && line.dimensions.length > 10) {
    throw finagoServiceError(`${label}.dimensions must contain at most 10 dimensions.`);
  }
};

let validatePostTransactionInput = (input: PostTransactionInput) => {
  requireDateOnly(input.date, 'date');
  requireMaxLength(input.comment, 'comment', transactionCommentMaxLength);
  rejectAdditionalFields(
    input.additionalFields,
    ['confirm', 'transactionTypeNumber', 'date', 'comment', 'documentId', 'lines'],
    'posting a transaction'
  );

  if (input.lines.length < 2) {
    throw finagoServiceError('Provide at least two transaction lines.');
  }
  if (input.lines.length > 1000) {
    throw finagoServiceError('lines must contain at most 1000 transaction lines.');
  }

  let totalsByDate = new Map<string, number>();
  input.lines.forEach((line, index) => {
    validateTransactionLine(line, index);
    let effectiveDate = line.date ?? input.date;
    totalsByDate.set(effectiveDate, (totalsByDate.get(effectiveDate) ?? 0) + line.amount);
  });

  for (let [date, total] of totalsByDate) {
    if (Math.abs(total) > 0.000001) {
      throw finagoServiceError(
        `Transaction lines must balance to zero per date; ${date} balances to ${total}.`
      );
    }
  }
};

export let finagoListTransactionLines = SlateTool.create(spec, {
  name: 'List Transaction Lines',
  key: 'finago_list_transaction_lines',
  description:
    'Read Finago ledger transaction lines for a required date range with filters for creation/modification time, transaction, customer, account, invoice, currency, dimensions, and pagination.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      dateFrom: z.string().describe('Inclusive start date in YYYY-MM-DD format.'),
      dateTo: z.string().describe('Exclusive end date in YYYY-MM-DD format.'),
      createdFrom: z
        .string()
        .optional()
        .describe('Created timestamp lower bound in ISO 8601 date-time format.'),
      modifiedFrom: z
        .string()
        .optional()
        .describe('Modified timestamp lower bound in ISO 8601 date-time format.'),
      transactionId: z
        .string()
        .optional()
        .describe('Transaction UUID, returned as transaction.id.'),
      transactionNumber: z.number().int().optional().describe('Transaction number.'),
      transactionTypeId: z.number().int().optional().describe('Transaction type ID.'),
      customerId: z.number().int().optional().describe('Customer ID.'),
      accountId: z.number().int().optional().describe('Account ID.'),
      accountNumber: z.number().int().optional().describe('Account number.'),
      invoiceNumber: z.string().optional().describe('Invoice number.'),
      currencyCode: z.string().optional().describe('Currency code.'),
      includeDimensions: z.boolean().optional().describe('Include dimension details.'),
      page: z.number().int().positive().optional().describe('Page number.'),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum transaction lines to retrieve per page. Finago defaults to 50.'),
      maxPages: maxPagesSchema
    })
  )
  .output(
    z.object({
      transactionLines: z.array(z.unknown()).describe('Transaction lines returned by Finago.'),
      count: z.number(),
      pageCount: z.number().optional(),
      hasNextPage: z.boolean().optional(),
      nextLink: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateTransactionLineListInput(ctx.input);

    let client = createClientFromContext(ctx);
    let result = await client.list(
      '/transactionlines',
      {
        dateFrom: ctx.input.dateFrom,
        dateTo: ctx.input.dateTo,
        createdFrom: ctx.input.createdFrom,
        modifiedFrom: ctx.input.modifiedFrom,
        transactionId: ctx.input.transactionId,
        transactionNumber: ctx.input.transactionNumber,
        transactionTypeId: ctx.input.transactionTypeId,
        customerId: ctx.input.customerId,
        accountId: ctx.input.accountId,
        accountNumber: ctx.input.accountNumber,
        invoiceNumber: ctx.input.invoiceNumber,
        currencyCode: ctx.input.currencyCode,
        includeDimensions: ctx.input.includeDimensions,
        page: ctx.input.page,
        limit: ctx.input.limit
      },
      ctx.input.maxPages ?? 1,
      'list transaction lines'
    );

    return {
      output: {
        transactionLines: result.records,
        count: result.count,
        pageCount: result.pageCount,
        hasNextPage: result.hasNextPage,
        nextLink: result.nextLink
      },
      message: `Retrieved **${result.count}** Finago transaction line(s).`
    };
  })
  .build();

export let finagoGetAccountBalances = SlateTool.create(spec, {
  name: 'Get Account Balances',
  key: 'finago_get_account_balances',
  description:
    'Read Finago account balances and monthly changes for a date range, optionally for one account.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      dateFrom: z.string().describe('Start date for balances.'),
      dateTo: z.string().describe('End date for balances.'),
      accountId: z.number().int().positive().optional().describe('Optional account ID.'),
      periods: z
        .string()
        .optional()
        .describe(
          'Comma-separated balance period dates in YYYY-MM-DD format. Each date may optionally end with Z.'
        ),
      type: z.enum(['Date', 'Period']).optional().describe('Balance aggregation type.'),
      keepIncoming: z.boolean().optional().describe('Include incoming amounts.')
    })
  )
  .output(
    z.object({
      balances: z.array(z.unknown()).describe('Account balances returned by Finago.'),
      count: z.number().describe('Number of account balance records returned.'),
      beginningAt: z
        .string()
        .optional()
        .describe('HAL response beginning date, when returned by Finago.'),
      endingAt: z
        .string()
        .optional()
        .describe('HAL response ending date, when returned by Finago.'),
      fiscals: z
        .array(z.unknown())
        .optional()
        .describe('HAL response fiscal periods, when returned by Finago.')
    })
  )
  .handleInvocation(async ctx => {
    validateAccountBalanceInput(ctx.input);

    let client = createClientFromContext(ctx);
    let path =
      ctx.input.accountId !== undefined
        ? `/accountbalances/${ctx.input.accountId}`
        : '/accountbalances';
    let data = await client.get(
      path,
      {
        dateFrom: ctx.input.dateFrom,
        dateTo: ctx.input.dateTo,
        periods: ctx.input.periods,
        type: ctx.input.type,
        keepIncoming: ctx.input.keepIncoming
      },
      'get account balances'
    );
    let result = normalizeAccountBalanceResponse(data);

    return {
      output: {
        balances: result.balances,
        count: result.balances.length,
        beginningAt: result.beginningAt,
        endingAt: result.endingAt,
        fiscals: result.fiscals
      },
      message: `Retrieved **${result.balances.length}** Finago account balance record(s).`
    };
  })
  .build();

export let finagoPostTransaction = SlateTool.create(spec, {
  name: 'Post Transaction',
  key: 'finago_post_transaction',
  description:
    'Post a balanced transaction to the Finago general ledger. Use reference data and account/tax lists before calling this tool.',
  constraints: [
    'All lines must balance to zero per date.',
    'confirm must be true.',
    'Use this only for user-approved posting workflows, not read-only reporting.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      confirm: z.boolean().describe('Must be true to post the transaction.'),
      transactionTypeNumber: z
        .number()
        .int()
        .positive()
        .describe('Finago transaction type number.'),
      date: z.string().describe('Transaction date in YYYY-MM-DD format.'),
      comment: z
        .string()
        .max(transactionCommentMaxLength)
        .optional()
        .describe('Transaction comment. Applied to all lines unless overridden.'),
      documentId: z.number().int().positive().optional().describe('Attached document ID.'),
      lines: z
        .array(transactionLineInputSchema)
        .min(2)
        .max(1000)
        .describe('Balanced transaction lines.'),
      additionalFields: additionalFieldsSchema
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Created transaction ID.'),
      record: z.unknown().describe('Raw Finago transaction creation response.')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.confirm !== true) {
      throw finagoServiceError('confirm must be true to post a transaction.');
    }

    validatePostTransactionInput(ctx.input);

    let client = createClientFromContext(ctx);
    let body = mergeAdditionalFields(
      objectWithDefined({
        transactionTypeNumber: ctx.input.transactionTypeNumber,
        date: ctx.input.date,
        comment: ctx.input.comment,
        documentId: ctx.input.documentId,
        lines: ctx.input.lines.map(buildTransactionLine)
      }),
      ctx.input.additionalFields
    );
    let record = await client.post('/transactions', body, undefined, 'post transaction');
    if (!isRecord(record) || typeof record.transactionId !== 'string') {
      throw finagoServiceError(
        'Finago did not return transactionId for the posted transaction.'
      );
    }

    return {
      output: { transactionId: record.transactionId, record },
      message: `Posted Finago transaction **${record.transactionId}**.`
    };
  })
  .build();
