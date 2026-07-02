import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  asRecord,
  booleanByKeys,
  booleanEqualsFilter,
  combineFilters,
  containsFilter,
  createClient,
  dateFromFilter,
  dateToFilter,
  idFrom,
  listMetadata,
  listMetadataSchema,
  nameFrom,
  numberByKeys,
  numberEqualsFilter,
  queryInputShape,
  queryParams,
  rawRecordSchema,
  requireCompanyKey,
  stringByKeys,
  stringEqualsFilter
} from './shared';

let customerInvoiceSchema = z.object({
  id: z.number().optional(),
  invoiceNumber: z.string().optional(),
  customerId: z.number().optional(),
  customerName: z.string().optional(),
  invoiceDate: z.string().optional(),
  paymentDueDate: z.string().optional(),
  statusCode: z.number().optional(),
  printStatus: z.number().optional(),
  taxInclusiveAmount: z.number().optional(),
  taxExclusiveAmount: z.number().optional(),
  restAmount: z.number().optional(),
  deleted: z.boolean().optional(),
  raw: rawRecordSchema
});

let supplierInvoiceSchema = z.object({
  id: z.number().optional(),
  invoiceNumber: z.string().optional(),
  supplierId: z.number().optional(),
  supplierName: z.string().optional(),
  supplierOrgNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  financialDate: z.string().optional(),
  paymentDueDate: z.string().optional(),
  statusCode: z.number().optional(),
  paymentStatus: z.number().optional(),
  taxInclusiveAmount: z.number().optional(),
  taxExclusiveAmount: z.number().optional(),
  restAmount: z.number().optional(),
  isSentToPayment: z.boolean().optional(),
  deleted: z.boolean().optional(),
  raw: rawRecordSchema
});

let supplierInvoiceDetailSchema = supplierInvoiceSchema.extend({
  printStatus: z.number().optional(),
  preventPayment: z.boolean().optional(),
  credited: z.boolean().optional(),
  creditedAmount: z.number().optional(),
  creditedAmountCurrency: z.number().optional(),
  payableRoundingAmount: z.number().optional(),
  payableRoundingCurrencyAmount: z.number().optional(),
  invoiceOriginType: z.number().optional(),
  journalEntryId: z.number().optional()
});

let reportOutputSchema = z.object({
  report: z.any().describe('Raw Unimicro accounting report payload.')
});

let mapCustomerInvoice = (value: unknown): z.infer<typeof customerInvoiceSchema> => {
  let record = asRecord(value);
  return {
    id: idFrom(record),
    invoiceNumber: stringByKeys(record, ['InvoiceNumber']),
    customerId: numberByKeys(record, ['CustomerID']),
    customerName:
      stringByKeys(record, ['CustomerName']) ?? nameFrom(asRecord(record.Customer)),
    invoiceDate: stringByKeys(record, ['InvoiceDate']),
    paymentDueDate: stringByKeys(record, ['PaymentDueDate']),
    statusCode: numberByKeys(record, ['StatusCode']),
    printStatus: numberByKeys(record, ['PrintStatus']),
    taxInclusiveAmount: numberByKeys(record, [
      'TaxInclusiveAmount',
      'TaxInclusiveAmountCurrency'
    ]),
    taxExclusiveAmount: numberByKeys(record, [
      'TaxExclusiveAmount',
      'TaxExclusiveAmountCurrency'
    ]),
    restAmount: numberByKeys(record, ['RestAmount', 'RestAmountCurrency']),
    deleted: booleanByKeys(record, ['Deleted']),
    raw: record
  };
};

let mapSupplierInvoice = (value: unknown): z.infer<typeof supplierInvoiceSchema> => {
  let record = asRecord(value);
  let supplier = asRecord(record.Supplier ?? record.CostSupplier);
  return {
    id: idFrom(record),
    invoiceNumber: stringByKeys(record, ['InvoiceNumber']),
    supplierId: numberByKeys(record, ['SupplierID', 'CostSupplierID']),
    supplierName: nameFrom(supplier),
    supplierOrgNumber: stringByKeys(record, ['SupplierOrgNumber']),
    invoiceDate: stringByKeys(record, ['InvoiceDate']),
    financialDate: stringByKeys(record, ['FinancialDate']),
    paymentDueDate: stringByKeys(record, ['PaymentDueDate']),
    statusCode: numberByKeys(record, ['StatusCode']),
    paymentStatus: numberByKeys(record, ['PaymentStatus']),
    taxInclusiveAmount: numberByKeys(record, [
      'TaxInclusiveAmount',
      'TaxInclusiveAmountCurrency'
    ]),
    taxExclusiveAmount: numberByKeys(record, [
      'TaxExclusiveAmount',
      'TaxExclusiveAmountCurrency'
    ]),
    restAmount: numberByKeys(record, ['RestAmount', 'RestAmountCurrency']),
    isSentToPayment: booleanByKeys(record, ['IsSentToPayment']),
    deleted: booleanByKeys(record, ['Deleted']),
    raw: record
  };
};

let mapSupplierInvoiceDetail = (
  value: unknown
): z.infer<typeof supplierInvoiceDetailSchema> => {
  let record = asRecord(value);
  return {
    ...mapSupplierInvoice(record),
    printStatus: numberByKeys(record, ['PrintStatus']),
    preventPayment: booleanByKeys(record, ['PreventPayment']),
    credited: booleanByKeys(record, ['Credited']),
    creditedAmount: numberByKeys(record, ['CreditedAmount']),
    creditedAmountCurrency: numberByKeys(record, ['CreditedAmountCurrency']),
    payableRoundingAmount: numberByKeys(record, ['PayableRoundingAmount']),
    payableRoundingCurrencyAmount: numberByKeys(record, ['PayableRoundingCurrencyAmount']),
    invoiceOriginType: numberByKeys(record, ['InvoiceOriginType']),
    journalEntryId: numberByKeys(record, ['JournalEntryID'])
  };
};

let invoiceListInput = {
  invoiceNumber: z.string().optional(),
  statusCode: z.number().int().optional(),
  invoiceDateFrom: z
    .string()
    .optional()
    .describe('Filter InvoiceDate greater than or equal to this date.'),
  invoiceDateTo: z
    .string()
    .optional()
    .describe('Filter InvoiceDate less than or equal to this date.'),
  deleted: z.boolean().optional(),
  ...queryInputShape
};

export let listCustomerInvoices = SlateTool.create(spec, {
  name: 'List Customer Invoices',
  key: 'list_customer_invoices',
  description:
    'List SpareBank 1 Regnskap customer invoices with optional customer, invoice number, status, date, Unimicro filter/select/expand, and pagination.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().int().positive().optional(),
      customerName: z.string().optional(),
      ...invoiceListInput
    })
  )
  .output(
    z.object({
      invoices: z.array(customerInvoiceSchema),
      ...listMetadataSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let generatedFilter = combineFilters([
      numberEqualsFilter('CustomerID', ctx.input.customerId),
      containsFilter('CustomerName', ctx.input.customerName),
      stringEqualsFilter('InvoiceNumber', ctx.input.invoiceNumber),
      numberEqualsFilter('StatusCode', ctx.input.statusCode),
      dateFromFilter('InvoiceDate', ctx.input.invoiceDateFrom),
      dateToFilter('InvoiceDate', ctx.input.invoiceDateTo),
      booleanEqualsFilter('Deleted', ctx.input.deleted)
    ]);
    let raw = await client.list(
      '/invoices',
      queryParams(ctx.input, generatedFilter),
      requireCompanyKey(ctx, ctx.input.companyKey)
    );
    let invoices = raw.map(mapCustomerInvoice);

    return {
      output: {
        invoices,
        ...listMetadata(raw, ctx.input)
      },
      message: `Found **${invoices.length}** SpareBank 1 Regnskap customer invoice(s).`
    };
  })
  .build();

export let getCustomerInvoice = SlateTool.create(spec, {
  name: 'Get Customer Invoice',
  key: 'get_customer_invoice',
  description:
    'Fetch one SpareBank 1 Regnskap customer invoice by Unimicro invoice ID, with optional select and expand such as Items,Customer.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.number().int().positive().describe('Unimicro customer invoice ID.'),
      select: queryInputShape.select,
      expand: queryInputShape.expand,
      companyKey: queryInputShape.companyKey
    })
  )
  .output(z.object({ invoice: customerInvoiceSchema }))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let invoice = mapCustomerInvoice(
      await client.get(
        `/invoices/${ctx.input.invoiceId}`,
        queryParams(ctx.input),
        requireCompanyKey(ctx, ctx.input.companyKey)
      )
    );

    return {
      output: { invoice },
      message: `Fetched SpareBank 1 Regnskap customer invoice **${invoice.invoiceNumber ?? invoice.id ?? ctx.input.invoiceId}**.`
    };
  })
  .build();

export let listSupplierInvoices = SlateTool.create(spec, {
  name: 'List Supplier Invoices',
  key: 'list_supplier_invoices',
  description:
    'List SpareBank 1 Regnskap supplier invoices with optional supplier, invoice number, status, date, payment state, Unimicro filter/select/expand, and pagination.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      supplierId: z.number().int().positive().optional(),
      supplierOrgNumber: z.string().optional(),
      paymentStatus: z.number().int().optional(),
      isSentToPayment: z.boolean().optional(),
      ...invoiceListInput
    })
  )
  .output(
    z.object({
      supplierInvoices: z.array(supplierInvoiceSchema),
      ...listMetadataSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let generatedFilter = combineFilters([
      numberEqualsFilter('SupplierID', ctx.input.supplierId),
      stringEqualsFilter('SupplierOrgNumber', ctx.input.supplierOrgNumber),
      stringEqualsFilter('InvoiceNumber', ctx.input.invoiceNumber),
      numberEqualsFilter('StatusCode', ctx.input.statusCode),
      numberEqualsFilter('PaymentStatus', ctx.input.paymentStatus),
      booleanEqualsFilter('IsSentToPayment', ctx.input.isSentToPayment),
      dateFromFilter('InvoiceDate', ctx.input.invoiceDateFrom),
      dateToFilter('InvoiceDate', ctx.input.invoiceDateTo),
      booleanEqualsFilter('Deleted', ctx.input.deleted)
    ]);
    let raw = await client.list(
      '/supplierinvoices',
      queryParams(ctx.input, generatedFilter),
      requireCompanyKey(ctx, ctx.input.companyKey)
    );
    let supplierInvoices = raw.map(mapSupplierInvoice);

    return {
      output: {
        supplierInvoices,
        ...listMetadata(raw, ctx.input)
      },
      message: `Found **${supplierInvoices.length}** SpareBank 1 Regnskap supplier invoice(s).`
    };
  })
  .build();

export let getSupplierInvoice = SlateTool.create(spec, {
  name: 'Get Supplier Invoice',
  key: 'get_supplier_invoice',
  description:
    'Fetch one SpareBank 1 Regnskap supplier invoice by Unimicro supplier invoice ID, with optional select and expand such as Items,Supplier.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      supplierInvoiceId: z.number().int().positive().describe('Unimicro supplier invoice ID.'),
      select: queryInputShape.select,
      expand: queryInputShape.expand,
      companyKey: queryInputShape.companyKey
    })
  )
  .output(z.object({ supplierInvoice: supplierInvoiceDetailSchema }))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let supplierInvoice = mapSupplierInvoiceDetail(
      await client.get(
        `/supplierinvoices/${ctx.input.supplierInvoiceId}`,
        queryParams(ctx.input),
        requireCompanyKey(ctx, ctx.input.companyKey)
      )
    );

    return {
      output: { supplierInvoice },
      message: `Fetched SpareBank 1 Regnskap supplier invoice **${supplierInvoice.invoiceNumber ?? supplierInvoice.id ?? ctx.input.supplierInvoiceId}**.`
    };
  })
  .build();

let profitAndLossInput = z.object({
  financialYear: z
    .number()
    .int()
    .optional()
    .describe('Unimicro FinancialYear query parameter.'),
  sumAllYears: z
    .string()
    .optional()
    .describe(
      'Unimicro SumAllYears query parameter. The official Swagger documents this parameter as a string.'
    ),
  companyKey: queryInputShape.companyKey
});

let balanceSheetInput = z.object({
  financialYear: z
    .number()
    .int()
    .optional()
    .describe('Unimicro FinancialYear query parameter.'),
  companyKey: queryInputShape.companyKey
});

let trialBalanceInput = z.object({
  companyKey: queryInputShape.companyKey
});

export let getTrialBalance = SlateTool.create(spec, {
  name: 'Get Trial Balance',
  key: 'get_trial_balance',
  description:
    'Retrieve the SpareBank 1 Regnskap trial balance report from the Unimicro accounts action. The official Swagger does not expose date, year, select, or expand parameters for this action.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(trialBalanceInput)
  .output(reportOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let report = await client.report(
      '/accounts?action=trialbalance',
      {},
      requireCompanyKey(ctx, ctx.input.companyKey)
    );

    return {
      output: { report },
      message: 'Fetched SpareBank 1 Regnskap trial balance.'
    };
  })
  .build();

export let getProfitAndLoss = SlateTool.create(spec, {
  name: 'Get Profit and Loss',
  key: 'get_profit_and_loss',
  description:
    'Retrieve the SpareBank 1 Regnskap profit and loss report from the Unimicro accounts periodical action. The official Swagger exposes FinancialYear and SumAllYears query parameters for this action.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(profitAndLossInput)
  .output(reportOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let report = await client.report(
      '/accounts?action=profit-and-loss-periodical',
      {
        FinancialYear: ctx.input.financialYear,
        SumAllYears: ctx.input.sumAllYears
      },
      requireCompanyKey(ctx, ctx.input.companyKey)
    );

    return {
      output: { report },
      message: 'Fetched SpareBank 1 Regnskap profit and loss report.'
    };
  })
  .build();

export let getBalanceSheet = SlateTool.create(spec, {
  name: 'Get Balance Sheet',
  key: 'get_balance_sheet',
  description:
    'Retrieve the SpareBank 1 Regnskap balance sheet report from the Unimicro accounts action. The official Swagger exposes FinancialYear for this action.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(balanceSheetInput)
  .output(reportOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let report = await client.report(
      '/accounts?action=balance',
      {
        FinancialYear: ctx.input.financialYear
      },
      requireCompanyKey(ctx, ctx.input.companyKey)
    );

    return {
      output: { report },
      message: 'Fetched SpareBank 1 Regnskap balance sheet.'
    };
  })
  .build();
