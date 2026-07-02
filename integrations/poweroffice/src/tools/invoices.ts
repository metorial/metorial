import { SlateTool } from 'slates';
import { z } from 'zod';
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

let outgoingInvoiceSchema = z.object({
  id: z.string().optional().describe('PowerOffice invoice id.'),
  invoiceNo: z.number().optional().describe('Invoice number.'),
  voucherNo: z.number().optional().describe('Voucher number.'),
  voucherType: z.string().optional().describe('Voucher type.'),
  customerId: z.number().optional().describe('Customer id.'),
  customerNo: z.number().optional().describe('Customer number.'),
  orderNo: z.number().optional().describe('Related order number.'),
  importedOrderNo: z.number().optional().describe('Imported order number.'),
  externalImportReference: z.string().optional().describe('External import reference.'),
  customMatchingReference: z.string().optional().describe('Custom matching reference.'),
  voucherDate: z.string().optional().describe('Voucher/invoice date.'),
  dueDate: z.string().optional().describe('Due date.'),
  sentDateTimeOffset: z.string().optional().describe('Sent timestamp.'),
  currencyCode: z.string().optional().describe('Currency code.'),
  netAmount: z.number().optional().describe('Net amount.'),
  totalAmount: z.number().optional().describe('Total amount.'),
  balance: z.number().optional().describe('Open balance.'),
  isReversed: z.boolean().optional().describe('Whether the invoice is reversed.'),
  onlyCreatedByCurrentIntegration: z
    .boolean()
    .optional()
    .describe('Whether created by current integration.'),
  dimensions: accountingDimensionOutputSchema.optional(),
  record: rawRecordSchema
});

let invoiceLineSchema = z.object({
  id: z.string().optional().describe('PowerOffice invoice line id.'),
  lineType: z.string().optional().describe('Line type.'),
  sortOrder: z.number().optional().describe('Sort order.'),
  description: z.string().optional().describe('Line description.'),
  productId: z.number().optional().describe('Product id.'),
  productCode: z.string().optional().describe('Product code.'),
  quantity: z.number().optional().describe('Quantity.'),
  productUnitPrice: z.number().optional().describe('Unit price.'),
  productUnitCost: z.number().optional().describe('Unit cost.'),
  netAmount: z.number().optional().describe('Net amount.'),
  totalAmount: z.number().optional().describe('Total amount.'),
  vatAmount: z.number().optional().describe('VAT amount.'),
  vatCode: z.string().optional().describe('VAT code.'),
  vatRate: z.number().optional().describe('VAT rate.'),
  dimensions: accountingDimensionOutputSchema.optional(),
  record: rawRecordSchema
});

let incomingInvoiceSchema = z.object({
  id: z.string().optional().describe('PowerOffice incoming invoice id.'),
  invoiceNo: z.number().optional().describe('Supplier invoice number.'),
  voucherNo: z.number().optional().describe('Voucher number.'),
  voucherType: z.string().optional().describe('Voucher type.'),
  supplierId: z.number().optional().describe('Supplier id.'),
  supplierNo: z.number().optional().describe('Supplier number.'),
  externalImportReference: z.string().optional().describe('External import reference.'),
  voucherDate: z.string().optional().describe('Voucher/invoice date.'),
  dueDate: z.string().optional().describe('Due date.'),
  currencyCode: z.string().optional().describe('Currency code.'),
  netAmount: z.number().optional().describe('Net amount.'),
  totalAmount: z.number().optional().describe('Total amount.'),
  balance: z.number().optional().describe('Open balance.'),
  isReversed: z.boolean().optional().describe('Whether the invoice is reversed.'),
  dimensions: accountingDimensionOutputSchema.optional(),
  record: rawRecordSchema
});

let mapOutgoingInvoice = (invoice: Record<string, unknown>) => ({
  ...compactOutput({
    id: stringValue(invoice, 'Id'),
    invoiceNo: numberValue(invoice, 'InvoiceNo'),
    voucherNo: numberValue(invoice, 'VoucherNo'),
    voucherType: stringValue(invoice, 'VoucherType'),
    customerId: numberValue(invoice, 'CustomerId'),
    customerNo: numberValue(invoice, 'CustomerNo'),
    orderNo: numberValue(invoice, 'OrderNo'),
    importedOrderNo: numberValue(invoice, 'ImportedOrderNo'),
    externalImportReference: stringValue(invoice, 'ExternalImportReference'),
    customMatchingReference: stringValue(invoice, 'CustomMatchingReference'),
    voucherDate: stringValue(invoice, 'VoucherDate'),
    dueDate: stringValue(invoice, 'DueDate'),
    sentDateTimeOffset: stringValue(invoice, 'SentDateTimeOffset'),
    currencyCode: stringValue(invoice, 'CurrencyCode'),
    netAmount: numberValue(invoice, 'NetAmount'),
    totalAmount: numberValue(invoice, 'TotalAmount'),
    balance: numberValue(invoice, 'Balance'),
    isReversed:
      typeof invoice.IsReversed === 'boolean' ? (invoice.IsReversed as boolean) : undefined,
    onlyCreatedByCurrentIntegration:
      typeof invoice.IsCreatedByCurrentIntegration === 'boolean'
        ? (invoice.IsCreatedByCurrentIntegration as boolean)
        : undefined,
    dimensions: mapDimensions(invoice)
  }),
  record: invoice
});

let mapInvoiceLine = (line: Record<string, unknown>) => ({
  ...compactOutput({
    id: stringValue(line, 'Id'),
    lineType: stringValue(line, 'LineType'),
    sortOrder: numberValue(line, 'SortOrder'),
    description: stringValue(line, 'Description'),
    productId: numberValue(line, 'ProductId'),
    productCode: stringValue(line, 'ProductCode'),
    quantity: numberValue(line, 'Quantity'),
    productUnitPrice: numberValue(line, 'ProductUnitPrice'),
    productUnitCost: numberValue(line, 'ProductUnitCost'),
    netAmount: numberValue(line, 'NetAmount'),
    totalAmount: numberValue(line, 'TotalAmount'),
    vatAmount: numberValue(line, 'VatAmount'),
    vatCode: stringValue(line, 'VatCode'),
    vatRate: numberValue(line, 'VatRate'),
    dimensions: mapDimensions(line)
  }),
  record: line
});

let mapIncomingInvoice = (invoice: Record<string, unknown>) => ({
  ...compactOutput({
    id: stringValue(invoice, 'Id'),
    invoiceNo: numberValue(invoice, 'InvoiceNo'),
    voucherNo: numberValue(invoice, 'VoucherNo'),
    voucherType: stringValue(invoice, 'VoucherType'),
    supplierId: numberValue(invoice, 'SupplierId'),
    supplierNo: numberValue(invoice, 'SupplierNo'),
    externalImportReference: stringValue(invoice, 'ExternalImportReference'),
    voucherDate: stringValue(invoice, 'VoucherDate'),
    dueDate: stringValue(invoice, 'DueDate'),
    currencyCode: stringValue(invoice, 'CurrencyCode'),
    netAmount: numberValue(invoice, 'NetAmount'),
    totalAmount: numberValue(invoice, 'TotalAmount'),
    balance: numberValue(invoice, 'Balance'),
    isReversed:
      typeof invoice.IsReversed === 'boolean' ? (invoice.IsReversed as boolean) : undefined,
    dimensions: mapDimensions(invoice)
  }),
  record: invoice
});

export let powerofficeListOutgoingInvoices = SlateTool.create(spec, {
  name: 'List PowerOffice Outgoing Invoices',
  key: 'poweroffice_list_outgoing_invoices',
  description:
    'List PowerOffice outgoing customer invoices for accounts receivable, unpaid invoice, project, date range, and reconciliation workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z.string().optional().describe('Invoice/voucher date from (YYYY-MM-DD).'),
      toDate: z.string().optional().describe('Invoice/voucher date to (YYYY-MM-DD).'),
      customerNos: z.string().optional().describe('Customer numbers filter.'),
      invoiceIds: z.string().optional().describe('Invoice ids filter.'),
      invoiceNos: z.string().optional().describe('Invoice numbers filter.'),
      voucherNos: z.string().optional().describe('Voucher numbers filter.'),
      orderNos: z.string().optional().describe('Order numbers filter.'),
      importedOrderNos: z.string().optional().describe('Imported order numbers filter.'),
      externalImportReferences: z.string().optional().describe('External references filter.'),
      customMatchingReferences: z.string().optional().describe('Custom matching references.'),
      departmentCodes: z.string().optional().describe('Department codes filter.'),
      includeSubProject: z.boolean().optional().describe('Include subprojects.'),
      onlyCreatedByCurrentIntegration: z
        .boolean()
        .optional()
        .describe('Only return invoices created by this integration.'),
      onlyUnpaidInvoices: z
        .boolean()
        .optional()
        .describe('Only return invoices with balance.'),
      projectCodes: z.string().optional().describe('Project codes filter.'),
      sentDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return invoices sent after this timestamp.'),
      balanceLastChangedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return invoices with balance changed after this timestamp.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      invoices: z.array(outgoingInvoiceSchema).describe('Outgoing invoices.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let invoices = await client.listOutgoingInvoices(
      buildListParams(ctx.input, {
        fromDate: ctx.input.fromDate,
        toDate: ctx.input.toDate,
        customerNos: ctx.input.customerNos,
        customMatchingReferences: ctx.input.customMatchingReferences,
        departmentCodes: ctx.input.departmentCodes,
        externalImportReferences: ctx.input.externalImportReferences,
        importedOrderNos: ctx.input.importedOrderNos,
        orderNos: ctx.input.orderNos,
        includeSubProject: ctx.input.includeSubProject,
        invoiceIds: ctx.input.invoiceIds,
        invoiceNos: ctx.input.invoiceNos,
        onlyCreatedByCurrentIntegration: ctx.input.onlyCreatedByCurrentIntegration,
        onlyUnpaidInvoices: ctx.input.onlyUnpaidInvoices,
        projectCodes: ctx.input.projectCodes,
        sentDateTimeOffsetGreaterThan: ctx.input.sentDateTimeOffsetGreaterThan,
        balanceLastChangedDateTimeOffsetGreaterThan:
          ctx.input.balanceLastChangedDateTimeOffsetGreaterThan,
        voucherNos: ctx.input.voucherNos
      })
    );

    return {
      output: {
        invoices: invoices.map(mapOutgoingInvoice),
        page: pageSummary(ctx.input, invoices.length)
      },
      message: `Retrieved **${invoices.length}** PowerOffice outgoing invoice(s).`
    };
  })
  .build();

export let powerofficeGetOutgoingInvoice = SlateTool.create(spec, {
  name: 'Get PowerOffice Outgoing Invoice',
  key: 'poweroffice_get_outgoing_invoice',
  description:
    'Get a specific PowerOffice outgoing invoice or credit note header by id for AR reconciliation and detail workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().min(1).describe('PowerOffice outgoing invoice id.')
    })
  )
  .output(
    z.object({
      invoice: outgoingInvoiceSchema.describe('Outgoing invoice.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let invoice = await client.getOutgoingInvoice(ctx.input.invoiceId);

    return {
      output: {
        invoice: mapOutgoingInvoice(invoice)
      },
      message: `Retrieved PowerOffice outgoing invoice **${numberValue(invoice, 'InvoiceNo') ?? ctx.input.invoiceId}**.`
    };
  })
  .build();

export let powerofficeGetOutgoingInvoiceLines = SlateTool.create(spec, {
  name: 'Get PowerOffice Outgoing Invoice Lines',
  key: 'poweroffice_get_outgoing_invoice_lines',
  description:
    'Retrieve line details for a specific PowerOffice outgoing invoice, including product, VAT, amount, and accounting dimensions.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().min(1).describe('PowerOffice outgoing invoice id.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      lines: z.array(invoiceLineSchema).describe('Outgoing invoice lines.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let lines = await client.getOutgoingInvoiceLines(
      ctx.input.invoiceId,
      buildListParams(ctx.input)
    );

    return {
      output: {
        lines: lines.map(mapInvoiceLine),
        page: pageSummary(ctx.input, lines.length)
      },
      message: `Retrieved **${lines.length}** line(s) for PowerOffice outgoing invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();

export let powerofficeListIncomingInvoices = SlateTool.create(spec, {
  name: 'List PowerOffice Incoming Invoices',
  key: 'poweroffice_list_incoming_invoices',
  description:
    'List PowerOffice incoming supplier invoices for accounts payable, unpaid invoice, project, date range, and voucher analysis workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z.string().optional().describe('Invoice/voucher date from (YYYY-MM-DD).'),
      toDate: z.string().optional().describe('Invoice/voucher date to (YYYY-MM-DD).'),
      supplierNos: z.string().optional().describe('Supplier numbers filter.'),
      voucherNos: z.string().optional().describe('Voucher numbers filter.'),
      voucherTypes: z.string().optional().describe('Voucher types filter.'),
      departmentCodes: z.string().optional().describe('Department codes filter.'),
      includeSubProject: z.boolean().optional().describe('Include subprojects.'),
      onlyUnpaidInvoices: z
        .boolean()
        .optional()
        .describe('Only return invoices with balance.'),
      projectCodes: z.string().optional().describe('Project codes filter.'),
      balanceLastChangedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return invoices with balance changed after this timestamp.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      invoices: z.array(incomingInvoiceSchema).describe('Incoming invoices.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let invoices = await client.listIncomingInvoices(
      buildListParams(ctx.input, {
        fromDate: ctx.input.fromDate,
        toDate: ctx.input.toDate,
        balanceLastChangedDateTimeOffsetGreaterThan:
          ctx.input.balanceLastChangedDateTimeOffsetGreaterThan,
        departmentCodes: ctx.input.departmentCodes,
        includeSubProject: ctx.input.includeSubProject,
        onlyUnpaidInvoices: ctx.input.onlyUnpaidInvoices,
        projectCodes: ctx.input.projectCodes,
        supplierNos: ctx.input.supplierNos,
        voucherNos: ctx.input.voucherNos,
        voucherTypes: ctx.input.voucherTypes
      })
    );

    return {
      output: {
        invoices: invoices.map(mapIncomingInvoice),
        page: pageSummary(ctx.input, invoices.length)
      },
      message: `Retrieved **${invoices.length}** PowerOffice incoming invoice(s).`
    };
  })
  .build();

export let powerofficeGetIncomingInvoice = SlateTool.create(spec, {
  name: 'Get PowerOffice Incoming Invoice',
  key: 'poweroffice_get_incoming_invoice',
  description:
    'Get a specific PowerOffice incoming supplier invoice header by id for AP reconciliation and voucher analysis.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().min(1).describe('PowerOffice incoming invoice id.')
    })
  )
  .output(
    z.object({
      invoice: incomingInvoiceSchema.describe('Incoming invoice.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let invoice = await client.getIncomingInvoice(ctx.input.invoiceId);

    return {
      output: {
        invoice: mapIncomingInvoice(invoice)
      },
      message: `Retrieved PowerOffice incoming invoice **${numberValue(invoice, 'InvoiceNo') ?? ctx.input.invoiceId}**.`
    };
  })
  .build();
