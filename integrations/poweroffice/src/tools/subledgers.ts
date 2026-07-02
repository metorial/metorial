import { SlateTool } from 'slates';
import { z } from 'zod';
import { powerOfficeValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  accountingDimensionOutputSchema,
  buildListParams,
  compactOutput,
  createClient,
  mapDimensions,
  numberValue,
  pageSummary,
  paginationInputSchema,
  paginationOutputSchema,
  rawRecordSchema,
  stringValue
} from './shared';

let subledgerActionSchema = z.enum([
  'open_items',
  'balances',
  'statement',
  'entries_by_match_id'
]);

let subledgerEntrySchema = z.object({
  id: z.string().optional().describe('Subledger entry id.'),
  matchId: z.number().optional().describe('Match id.'),
  customerNo: z.number().optional().describe('Customer number when reading customer ledger.'),
  supplierNo: z.number().optional().describe('Supplier number when reading supplier ledger.'),
  invoiceNo: z.number().optional().describe('Invoice number.'),
  voucherNo: z.number().optional().describe('Voucher number.'),
  voucherType: z.string().optional().describe('Voucher type.'),
  postingDate: z.string().optional().describe('Posting date.'),
  voucherDate: z.string().optional().describe('Voucher date.'),
  dueDate: z.string().optional().describe('Due date.'),
  amount: z.number().optional().describe('Amount.'),
  balance: z.number().optional().describe('Open balance.'),
  currencyAmount: z.number().optional().describe('Currency amount.'),
  currencyCode: z.string().optional().describe('Currency code.'),
  description: z.string().optional().describe('Entry description.'),
  customMatchingReference: z.string().optional().describe('Custom matching reference.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  dimensions: accountingDimensionOutputSchema.optional(),
  record: rawRecordSchema
});

let subledgerBalanceSchema = z.object({
  customerNo: z.number().optional().describe('Customer number when reading customer ledger.'),
  supplierNo: z.number().optional().describe('Supplier number when reading supplier ledger.'),
  customerId: z.number().optional().describe('Customer id.'),
  supplierId: z.number().optional().describe('Supplier id.'),
  name: z.string().optional().describe('Customer or supplier name.'),
  balance: z.number().optional().describe('Balance as of requested date.'),
  currencyCode: z.string().optional().describe('Currency code.'),
  record: rawRecordSchema
});

let mapSubledgerEntry = (entry: Record<string, unknown>) => ({
  ...compactOutput({
    id: stringValue(entry, 'Id'),
    matchId: numberValue(entry, 'MatchId'),
    customerNo: numberValue(entry, 'CustomerNo'),
    supplierNo: numberValue(entry, 'SupplierNo'),
    invoiceNo: numberValue(entry, 'InvoiceNo'),
    voucherNo: numberValue(entry, 'VoucherNo'),
    voucherType: stringValue(entry, 'VoucherType'),
    postingDate: stringValue(entry, 'PostingDate'),
    voucherDate: stringValue(entry, 'VoucherDate'),
    dueDate: stringValue(entry, 'DueDate'),
    amount: numberValue(entry, 'Amount'),
    balance: numberValue(entry, 'Balance'),
    currencyAmount: numberValue(entry, 'CurrencyAmount'),
    currencyCode: stringValue(entry, 'CurrencyCode'),
    description: stringValue(entry, 'Description'),
    customMatchingReference: stringValue(entry, 'CustomMatchingReference'),
    lastChangedDateTimeOffset: stringValue(entry, 'LastChangedDateTimeOffset'),
    dimensions: mapDimensions(entry)
  }),
  record: entry
});

let mapSubledgerBalance = (balance: Record<string, unknown>) => ({
  ...compactOutput({
    customerNo: numberValue(balance, 'CustomerNo'),
    supplierNo: numberValue(balance, 'SupplierNo'),
    customerId: numberValue(balance, 'CustomerId'),
    supplierId: numberValue(balance, 'SupplierId'),
    name:
      stringValue(balance, 'Name') ??
      stringValue(balance, 'CustomerName') ??
      stringValue(balance, 'SupplierName'),
    balance: numberValue(balance, 'Balance'),
    currencyCode: stringValue(balance, 'CurrencyCode')
  }),
  record: balance
});

let assertSubledgerInput = (input: {
  action: z.infer<typeof subledgerActionSchema>;
  date?: string;
  fromDate?: string;
  toDate?: string;
  matchId?: number;
}) => {
  if ((input.action === 'open_items' || input.action === 'balances') && !input.date) {
    throw powerOfficeValidationError('date is required for open_items and balances.');
  }
  if (input.action === 'statement') {
    if (!input.fromDate || !input.toDate) {
      throw powerOfficeValidationError('fromDate and toDate are required for statement.');
    }
    if (input.fromDate > input.toDate) {
      throw powerOfficeValidationError('fromDate must be earlier than or equal to toDate.');
    }
  }
  if (input.action === 'entries_by_match_id' && input.matchId === undefined) {
    throw powerOfficeValidationError('matchId is required for entries_by_match_id.');
  }
};

let pathForAction = (
  action: z.infer<typeof subledgerActionSchema>,
  party: 'customer' | 'supplier'
) => {
  if (action === 'open_items') return 'OpenItems';
  if (action === 'balances')
    return party === 'customer' ? 'CustomerBalances' : 'SupplierBalances';
  if (action === 'statement') return 'Statement';
  return 'EntriesByMatchId';
};

let commonSubledgerInputSchema = {
  action: subledgerActionSchema.describe('Subledger query to run.'),
  date: z.string().optional().describe('Date for open_items or balances (YYYY-MM-DD).'),
  fromDate: z.string().optional().describe('Statement start date (YYYY-MM-DD).'),
  toDate: z.string().optional().describe('Statement end date (YYYY-MM-DD).'),
  matchId: z.number().int().optional().describe('Match id for entries_by_match_id.'),
  contactGroupIds: z.string().optional().describe('Contact group ids filter.'),
  externalNos: z.string().optional().describe('External customer/supplier numbers filter.'),
  invoiceNos: z.string().optional().describe('Invoice numbers filter.'),
  customMatchingReferences: z
    .string()
    .optional()
    .describe('Custom matching references filter.'),
  departmentCodes: z.string().optional().describe('Department codes filter.'),
  projectCodes: z.string().optional().describe('Project codes filter.'),
  includeSubProject: z.boolean().optional().describe('Include subprojects.'),
  subLedgerNumberSeriesIds: z
    .string()
    .optional()
    .describe('Subledger number series ids filter.'),
  voucherTypes: z.string().optional().describe('Voucher types filter.'),
  onlyCreatedByCurrentIntegration: z
    .boolean()
    .optional()
    .describe('Only return entries created by the current integration.'),
  includeOnlyOpenItems: z
    .boolean()
    .optional()
    .describe('For balances action, include only parties with open items.'),
  createdDateTimeOffsetGreaterThan: z
    .string()
    .optional()
    .describe('Return entries created after this timestamp.'),
  lastChangedDateTimeOffsetGreaterThan: z
    .string()
    .optional()
    .describe('Return entries changed after this timestamp.'),
  ...paginationInputSchema
};

export let powerofficeListCustomerLedger = SlateTool.create(spec, {
  name: 'List PowerOffice Customer Ledger',
  key: 'poweroffice_list_customer_ledger',
  description:
    'List PowerOffice customer ledger open items, customer balances, statements, or entries sharing a match id for AR reconciliation.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...commonSubledgerInputSchema,
      customerNos: z.string().optional().describe('Customer numbers filter.'),
      onlyBalancesLessThanAmount: z
        .boolean()
        .optional()
        .describe('Only return entries with balances less than amount.')
    })
  )
  .output(
    z.object({
      action: subledgerActionSchema,
      entries: z.array(subledgerEntrySchema).optional().describe('Subledger entries.'),
      balances: z.array(subledgerBalanceSchema).optional().describe('Customer balances.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    assertSubledgerInput(ctx.input);
    let client = createClient(ctx);
    let records = await client.listCustomerLedger(
      pathForAction(ctx.input.action, 'customer'),
      buildListParams(ctx.input, {
        date: ctx.input.date,
        fromDate: ctx.input.fromDate,
        toDate: ctx.input.toDate,
        matchId: ctx.input.matchId,
        contactGroupIds: ctx.input.contactGroupIds,
        customerNos: ctx.input.customerNos,
        externalNos: ctx.input.externalNos,
        invoiceNos: ctx.input.invoiceNos,
        customMatchingReferences: ctx.input.customMatchingReferences,
        departmentCodes: ctx.input.departmentCodes,
        projectCodes: ctx.input.projectCodes,
        includeSubProject: ctx.input.includeSubProject,
        subLedgerNumberSeriesIds: ctx.input.subLedgerNumberSeriesIds,
        voucherTypes: ctx.input.voucherTypes,
        onlyCreatedByCurrentIntegration: ctx.input.onlyCreatedByCurrentIntegration,
        includeOnlyOpenItems: ctx.input.includeOnlyOpenItems,
        onlyBalancesLessThanAmount: ctx.input.onlyBalancesLessThanAmount,
        createdDateTimeOffsetGreaterThan: ctx.input.createdDateTimeOffsetGreaterThan,
        lastChangedDateTimeOffsetGreaterThan: ctx.input.lastChangedDateTimeOffsetGreaterThan
      })
    );

    return {
      output: {
        action: ctx.input.action,
        ...(ctx.input.action === 'balances'
          ? { balances: records.map(mapSubledgerBalance) }
          : { entries: records.map(mapSubledgerEntry) }),
        page: pageSummary(ctx.input, records.length)
      },
      message: `Retrieved **${records.length}** PowerOffice customer ledger record(s).`
    };
  })
  .build();

export let powerofficeListSupplierLedger = SlateTool.create(spec, {
  name: 'List PowerOffice Supplier Ledger',
  key: 'poweroffice_list_supplier_ledger',
  description:
    'List PowerOffice supplier ledger open items, supplier balances, statements, or entries sharing a match id for AP reconciliation.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...commonSubledgerInputSchema,
      supplierNos: z.string().optional().describe('Supplier numbers filter.'),
      onlyBalancesGreaterThanAmount: z
        .boolean()
        .optional()
        .describe('Only return entries with balances greater than amount.')
    })
  )
  .output(
    z.object({
      action: subledgerActionSchema,
      entries: z.array(subledgerEntrySchema).optional().describe('Subledger entries.'),
      balances: z.array(subledgerBalanceSchema).optional().describe('Supplier balances.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    assertSubledgerInput(ctx.input);
    let client = createClient(ctx);
    let records = await client.listSupplierLedger(
      pathForAction(ctx.input.action, 'supplier'),
      buildListParams(ctx.input, {
        date: ctx.input.date,
        fromDate: ctx.input.fromDate,
        toDate: ctx.input.toDate,
        matchId: ctx.input.matchId,
        contactGroupIds: ctx.input.contactGroupIds,
        supplierNos: ctx.input.supplierNos,
        externalNos: ctx.input.externalNos,
        invoiceNos: ctx.input.invoiceNos,
        customMatchingReferences: ctx.input.customMatchingReferences,
        departmentCodes: ctx.input.departmentCodes,
        projectCodes: ctx.input.projectCodes,
        includeSubProject: ctx.input.includeSubProject,
        subLedgerNumberSeriesIds: ctx.input.subLedgerNumberSeriesIds,
        voucherTypes: ctx.input.voucherTypes,
        onlyCreatedByCurrentIntegration: ctx.input.onlyCreatedByCurrentIntegration,
        includeOnlyOpenItems: ctx.input.includeOnlyOpenItems,
        onlyBalancesGreaterThanAmount: ctx.input.onlyBalancesGreaterThanAmount,
        createdDateTimeOffsetGreaterThan: ctx.input.createdDateTimeOffsetGreaterThan,
        lastChangedDateTimeOffsetGreaterThan: ctx.input.lastChangedDateTimeOffsetGreaterThan
      })
    );

    return {
      output: {
        action: ctx.input.action,
        ...(ctx.input.action === 'balances'
          ? { balances: records.map(mapSubledgerBalance) }
          : { entries: records.map(mapSubledgerEntry) }),
        page: pageSummary(ctx.input, records.length)
      },
      message: `Retrieved **${records.length}** PowerOffice supplier ledger record(s).`
    };
  })
  .build();
