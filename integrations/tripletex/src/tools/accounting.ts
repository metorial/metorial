import { createBase64Attachment, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { tripletexValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  asBoolean,
  asNumber,
  asRecord,
  asString,
  commonParams,
  companyIdFor,
  createClient,
  listMetadataSchema,
  listOutput,
  pagingInputShape,
  rawRecordSchema,
  ref
} from './shared';

let invoiceSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  invoiceNumber: z.number().optional(),
  invoiceDate: z.string().optional(),
  customerId: z.number().optional(),
  amount: z.number().optional(),
  amountCurrency: z.number().optional(),
  amountOutstanding: z.number().optional(),
  currencyId: z.number().optional(),
  isCreditNote: z.boolean().optional(),
  isCharged: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  raw: rawRecordSchema
});

let orderSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  number: z.string().optional(),
  displayName: z.string().optional(),
  customerId: z.number().optional(),
  customerName: z.string().optional(),
  orderDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  status: z.string().optional(),
  isClosed: z.boolean().optional(),
  isSubscription: z.boolean().optional(),
  projectId: z.number().optional(),
  amount: z.number().optional(),
  raw: rawRecordSchema
});

let supplierInvoiceSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  invoiceDueDate: z.string().optional(),
  supplierId: z.number().optional(),
  voucherId: z.number().optional(),
  amount: z.number().optional(),
  amountCurrency: z.number().optional(),
  outstandingAmount: z.number().optional(),
  currencyId: z.number().optional(),
  isCreditNote: z.boolean().optional(),
  raw: rawRecordSchema
});

let voucherSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  date: z.string().optional(),
  number: z.number().optional(),
  numberAsString: z.string().optional(),
  description: z.string().optional(),
  voucherTypeId: z.number().optional(),
  externalVoucherNumber: z.string().optional(),
  vendorInvoiceNumber: z.string().optional(),
  raw: rawRecordSchema
});

let postingSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  voucherId: z.number().optional(),
  accountId: z.number().optional(),
  accountNumber: z.number().optional(),
  accountName: z.string().optional(),
  customerId: z.number().optional(),
  supplierId: z.number().optional(),
  projectId: z.number().optional(),
  departmentId: z.number().optional(),
  amount: z.number().optional(),
  amountCurrency: z.number().optional(),
  amountGross: z.number().optional(),
  currencyId: z.number().optional(),
  invoiceNumber: z.string().optional(),
  raw: rawRecordSchema
});

let balanceSheetAccountSchema = z.object({
  accountId: z.number().optional(),
  accountNumber: z.number().optional(),
  accountName: z.string().optional(),
  balanceIn: z.number().optional(),
  balanceChange: z.number().optional(),
  balanceOut: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  raw: rawRecordSchema
});

let mapInvoice = (value: unknown): z.infer<typeof invoiceSchema> => {
  let record = asRecord(value);
  let customer = asRecord(record.customer);
  let currency = asRecord(record.currency);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    invoiceNumber: asNumber(record.invoiceNumber),
    invoiceDate: asString(record.invoiceDate),
    customerId: asNumber(customer.id),
    amount: asNumber(record.amount),
    amountCurrency: asNumber(record.amountCurrency),
    amountOutstanding: asNumber(record.amountOutstanding),
    currencyId: asNumber(currency.id),
    isCreditNote: asBoolean(record.isCreditNote),
    isCharged: asBoolean(record.isCharged),
    isApproved: asBoolean(record.isApproved),
    raw: record
  };
};

let mapOrder = (value: unknown): z.infer<typeof orderSchema> => {
  let record = asRecord(value);
  let customer = asRecord(record.customer);
  let project = asRecord(record.project);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    number: asString(record.number),
    displayName: asString(record.displayName),
    customerId: asNumber(customer.id),
    customerName: asString(record.customerName) ?? asString(customer.name),
    orderDate: asString(record.orderDate),
    deliveryDate: asString(record.deliveryDate),
    status: asString(record.status),
    isClosed: asBoolean(record.isClosed),
    isSubscription: asBoolean(record.isSubscription),
    projectId: asNumber(project.id),
    amount: asNumber(record.amount),
    raw: record
  };
};

let mapSupplierInvoice = (value: unknown): z.infer<typeof supplierInvoiceSchema> => {
  let record = asRecord(value);
  let supplier = asRecord(record.supplier);
  let voucher = asRecord(record.voucher);
  let currency = asRecord(record.currency);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    invoiceNumber: asString(record.invoiceNumber),
    invoiceDate: asString(record.invoiceDate),
    invoiceDueDate: asString(record.invoiceDueDate),
    supplierId: asNumber(supplier.id),
    voucherId: asNumber(voucher.id),
    amount: asNumber(record.amount),
    amountCurrency: asNumber(record.amountCurrency),
    outstandingAmount: asNumber(record.outstandingAmount),
    currencyId: asNumber(currency.id),
    isCreditNote: asBoolean(record.isCreditNote),
    raw: record
  };
};

let mapVoucher = (value: unknown): z.infer<typeof voucherSchema> => {
  let record = asRecord(value);
  let voucherType = asRecord(record.voucherType);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    date: asString(record.date),
    number: asNumber(record.number),
    numberAsString: asString(record.numberAsString),
    description: asString(record.description),
    voucherTypeId: asNumber(voucherType.id),
    externalVoucherNumber: asString(record.externalVoucherNumber),
    vendorInvoiceNumber: asString(record.vendorInvoiceNumber),
    raw: record
  };
};

let mapPosting = (value: unknown): z.infer<typeof postingSchema> => {
  let record = asRecord(value);
  let voucher = asRecord(record.voucher);
  let account = asRecord(record.account);
  let customer = asRecord(record.customer);
  let supplier = asRecord(record.supplier);
  let project = asRecord(record.project);
  let department = asRecord(record.department);
  let currency = asRecord(record.currency);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    date: asString(record.date),
    description: asString(record.description),
    voucherId: asNumber(voucher.id),
    accountId: asNumber(account.id),
    accountNumber: asNumber(account.number),
    accountName: asString(account.name),
    customerId: asNumber(customer.id),
    supplierId: asNumber(supplier.id),
    projectId: asNumber(project.id),
    departmentId: asNumber(department.id),
    amount: asNumber(record.amount),
    amountCurrency: asNumber(record.amountCurrency),
    amountGross: asNumber(record.amountGross),
    currencyId: asNumber(currency.id),
    invoiceNumber: asString(record.invoiceNumber),
    raw: record
  };
};

let mapBalanceSheetAccount = (value: unknown): z.infer<typeof balanceSheetAccountSchema> => {
  let record = asRecord(value);
  let account = asRecord(record.account);
  return {
    accountId: asNumber(account.id),
    accountNumber: asNumber(account.number),
    accountName: asString(account.name),
    balanceIn: asNumber(record.balanceIn),
    balanceChange: asNumber(record.balanceChange),
    balanceOut: asNumber(record.balanceOut),
    startDate: asString(record.startDate),
    endDate: asString(record.endDate),
    raw: record
  };
};

let pdfOutputSchema = z.object({
  resourceId: z.number().describe('Tripletex resource id used to download the PDF'),
  filename: z.string().describe('Attachment filename hint'),
  mimeType: z.string().describe('MIME type of the returned attachment'),
  byteLength: z.number().describe('Decoded byte length of the returned attachment'),
  attachmentCount: z.number().describe('Number of attachments returned')
});

let sendTypeSchema = z.enum([
  'EMAIL',
  'EHF',
  'AVTALEGIRO',
  'EFAKTURA',
  'VIPPS',
  'PAPER',
  'MANUAL'
]);

let orderLineInputSchema = z.object({
  productId: z.number().int().positive().optional().describe('Tripletex product id'),
  description: z.string().optional().describe('Line description'),
  count: z.number().optional().describe('Quantity'),
  unitPriceExcludingVatCurrency: z.number().optional(),
  unitPriceIncludingVatCurrency: z.number().optional(),
  unitCostCurrency: z.number().optional(),
  discount: z.number().optional().describe('Discount percentage'),
  markup: z.number().optional().describe('Markup percentage'),
  vatTypeId: z.number().int().positive().optional(),
  currencyId: z.number().int().positive().optional(),
  isSubscription: z.boolean().optional(),
  subscriptionPeriodStart: z.string().optional(),
  subscriptionPeriodEnd: z.string().optional()
});

let voucherPostingInputSchema = z.object({
  row: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Posting row number. Defaults to the one-based input order.'),
  accountId: z.number().int().positive().describe('Tripletex ledger account id'),
  amountGross: z.number().describe('Gross amount for the posting'),
  amountGrossCurrency: z
    .number()
    .optional()
    .describe('Gross amount in currency. Defaults to amountGross.'),
  description: z.string().optional(),
  customerId: z.number().int().positive().optional(),
  supplierId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  departmentId: z.number().int().positive().optional(),
  vatTypeId: z.number().int().min(0).optional()
});

let orderLineBody = (line: z.infer<typeof orderLineInputSchema>) =>
  pickDefined({
    product: ref(line.productId),
    description: line.description,
    count: line.count,
    unitPriceExcludingVatCurrency: line.unitPriceExcludingVatCurrency,
    unitPriceIncludingVatCurrency: line.unitPriceIncludingVatCurrency,
    unitCostCurrency: line.unitCostCurrency,
    discount: line.discount,
    markup: line.markup,
    vatType: ref(line.vatTypeId),
    currency: ref(line.currencyId),
    isSubscription: line.isSubscription,
    subscriptionPeriodStart: line.subscriptionPeriodStart,
    subscriptionPeriodEnd: line.subscriptionPeriodEnd
  });

let voucherPostingBody = (posting: z.infer<typeof voucherPostingInputSchema>, index: number) =>
  pickDefined({
    row: posting.row ?? index + 1,
    account: ref(posting.accountId),
    amountGross: posting.amountGross,
    amountGrossCurrency: posting.amountGrossCurrency ?? posting.amountGross,
    description: posting.description,
    customer: ref(posting.customerId),
    supplier: ref(posting.supplierId),
    project: ref(posting.projectId),
    department: ref(posting.departmentId),
    vatType: ref(posting.vatTypeId)
  });

let ensurePaymentPair = (
  paymentTypeId: number | undefined,
  paidAmount: number | undefined
) => {
  if (
    (paymentTypeId === undefined && paidAmount !== undefined) ||
    (paymentTypeId !== undefined && paidAmount === undefined)
  ) {
    throw tripletexValidationError('paymentTypeId and paidAmount must be provided together.');
  }
};

let ensureOrderLines = (lines: z.infer<typeof orderLineInputSchema>[]) => {
  for (let [index, line] of lines.entries()) {
    if (line.productId === undefined && !line.description?.trim()) {
      throw tripletexValidationError(
        `orderLines[${index}] must include either productId or description.`
      );
    }
  }
};

let ensureInvoiceSendOptions = (input: {
  sendToCustomer?: boolean;
  sendType?: z.infer<typeof sendTypeSchema>;
  overrideEmailAddress?: string;
}) => {
  if (input.sendToCustomer === true) return;

  if (input.sendType !== undefined || input.overrideEmailAddress !== undefined) {
    throw tripletexValidationError(
      'sendToCustomer must be true when sendType or overrideEmailAddress is provided.'
    );
  }
};

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description:
    'List charged outgoing Tripletex invoices for a required invoice date range with optional invoice number, customer, voucher, pagination, sorting, and fields.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      id: z.string().optional().describe('Comma-separated invoice ids'),
      invoiceDateFrom: z.string().describe('Invoice date from, inclusive, YYYY-MM-DD'),
      invoiceDateTo: z.string().describe('Invoice date to, exclusive, YYYY-MM-DD'),
      invoiceNumber: z.string().optional(),
      kid: z.string().optional(),
      voucherId: z.string().optional().describe('Comma-separated voucher ids'),
      customerId: z.string().optional(),
      ...pagingInputShape
    })
  )
  .output(z.object({ invoices: z.array(invoiceSchema), ...listMetadataSchema }))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.list(
      '/invoice',
      {
        ...commonParams(ctx.input),
        id: ctx.input.id,
        invoiceDateFrom: ctx.input.invoiceDateFrom,
        invoiceDateTo: ctx.input.invoiceDateTo,
        invoiceNumber: ctx.input.invoiceNumber,
        kid: ctx.input.kid,
        voucherId: ctx.input.voucherId,
        customerId: ctx.input.customerId
      },
      companyIdFor(ctx, ctx.input.companyId)
    );
    let invoices = (response.values ?? []).map(mapInvoice);
    return {
      output: { invoices, ...listOutput(response) },
      message: `Found **${invoices.length}** Tripletex invoice(s).`
    };
  })
  .build();

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description:
    'Create a Tripletex invoice with embedded invoice/order lines. The tool defaults sendToCustomer to false so invoice sending remains explicit.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.number().int().positive().describe('Tripletex customer id'),
      invoiceDate: z.string().describe('Invoice date, YYYY-MM-DD'),
      invoiceDueDate: z.string().optional().describe('Invoice due date, YYYY-MM-DD'),
      currencyId: z.number().int().positive().optional(),
      invoiceComment: z.string().optional(),
      comment: z.string().optional(),
      deliveryDate: z.string().optional(),
      orderLines: z
        .array(orderLineInputSchema)
        .min(1)
        .describe('Invoice lines to create with the invoice'),
      sendToCustomer: z
        .boolean()
        .optional()
        .describe('Whether Tripletex should send the invoice. Defaults to false.'),
      paymentTypeId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Payment type for prepayment. Must be paired with paidAmount.'),
      paidAmount: z
        .number()
        .optional()
        .describe('Prepaid amount in invoice currency. Must be paired with paymentTypeId.'),
      fields: pagingInputShape.fields,
      companyId: pagingInputShape.companyId
    })
  )
  .output(z.object({ invoice: invoiceSchema }))
  .handleInvocation(async ctx => {
    ensurePaymentPair(ctx.input.paymentTypeId, ctx.input.paidAmount);
    ensureOrderLines(ctx.input.orderLines);

    let client = createClient(ctx);
    let value = await client.createValue(
      '/invoice',
      pickDefined({
        customer: ref(ctx.input.customerId),
        invoiceDate: ctx.input.invoiceDate,
        invoiceDueDate: ctx.input.invoiceDueDate ?? ctx.input.invoiceDate,
        currency: ref(ctx.input.currencyId),
        comment: ctx.input.comment,
        orders: [
          pickDefined({
            customer: ref(ctx.input.customerId),
            orderDate: ctx.input.invoiceDate,
            deliveryDate: ctx.input.deliveryDate ?? ctx.input.invoiceDate,
            currency: ref(ctx.input.currencyId),
            invoiceComment: ctx.input.invoiceComment,
            orderLines: ctx.input.orderLines.map(orderLineBody)
          })
        ]
      }),
      {
        sendToCustomer: ctx.input.sendToCustomer ?? false,
        paymentTypeId: ctx.input.paymentTypeId,
        paidAmount: ctx.input.paidAmount,
        fields: ctx.input.fields
      },
      companyIdFor(ctx, ctx.input.companyId)
    );
    let invoice = mapInvoice(value);
    return {
      output: { invoice },
      message: `Created Tripletex invoice **${invoice.invoiceNumber ?? invoice.id ?? 'new'}**.`
    };
  })
  .build();

export let sendInvoice = SlateTool.create(spec, {
  name: 'Send Invoice',
  key: 'send_invoice',
  description:
    'Send an existing Tripletex invoice by invoice id and send type, optionally overriding the email recipient.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().int().positive().describe('Tripletex invoice id'),
      sendType: sendTypeSchema.describe('Invoice send method'),
      overrideEmailAddress: z.string().optional(),
      companyId: pagingInputShape.companyId
    })
  )
  .output(
    z.object({
      invoiceId: z.number(),
      sent: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.update(
      `/invoice/${ctx.input.invoiceId}/:send`,
      {},
      {
        sendType: ctx.input.sendType,
        overrideEmailAddress: ctx.input.overrideEmailAddress
      },
      companyIdFor(ctx, ctx.input.companyId)
    );

    return {
      output: {
        invoiceId: ctx.input.invoiceId,
        sent: true
      },
      message: `Sent Tripletex invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();

export let registerInvoicePayment = SlateTool.create(spec, {
  name: 'Register Invoice Payment',
  key: 'register_invoice_payment',
  description:
    'Register payment information on a Tripletex outgoing invoice using a payment type and paid amount.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().int().positive().describe('Tripletex invoice id'),
      paymentDate: z.string().describe('Payment date, YYYY-MM-DD'),
      paymentTypeId: z.number().int().positive().describe('Tripletex invoice payment type id'),
      paidAmount: z.number().describe('Paid amount in invoice currency'),
      paidAmountCurrency: z.number().optional(),
      fields: pagingInputShape.fields,
      companyId: pagingInputShape.companyId
    })
  )
  .output(z.object({ invoice: invoiceSchema }))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let value = await client.updateValue(
      `/invoice/${ctx.input.invoiceId}/:payment`,
      {},
      {
        paymentDate: ctx.input.paymentDate,
        paymentTypeId: ctx.input.paymentTypeId,
        paidAmount: ctx.input.paidAmount,
        paidAmountCurrency: ctx.input.paidAmountCurrency,
        fields: ctx.input.fields
      },
      companyIdFor(ctx, ctx.input.companyId)
    );
    let invoice = mapInvoice(value);

    return {
      output: { invoice },
      message: `Registered payment on Tripletex invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();

export let deleteOrder = SlateTool.create(spec, {
  name: 'Delete Order',
  key: 'delete_order',
  description: 'Delete a Tripletex order by id.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.number().int().positive().describe('Tripletex order id to delete.'),
      companyId: pagingInputShape.companyId
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('Deleted Tripletex order id')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.delete(`/order/${ctx.input.orderId}`, companyIdFor(ctx, ctx.input.companyId));

    return {
      output: {
        orderId: ctx.input.orderId
      },
      message: `Deleted Tripletex order **${ctx.input.orderId}**.`
    };
  })
  .build();

export let getInvoicePdf = SlateTool.create(spec, {
  name: 'Get Invoice PDF',
  key: 'get_invoice_pdf',
  description:
    'Download a Tripletex invoice PDF by invoice id and return it as a Slate attachment.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.number().int().positive().describe('Tripletex invoice id'),
      companyId: pagingInputShape.companyId
    })
  )
  .output(pdfOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let pdf = await client.downloadPdf(
      `/invoice/${ctx.input.invoiceId}/pdf`,
      companyIdFor(ctx, ctx.input.companyId),
      { download: true }
    );
    let filename = `tripletex-invoice-${ctx.input.invoiceId}.pdf`;
    return {
      output: {
        resourceId: ctx.input.invoiceId,
        filename,
        mimeType: pdf.mimeType,
        byteLength: pdf.byteLength,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(pdf.contentBase64, pdf.mimeType)],
      message: `Downloaded Tripletex invoice **${ctx.input.invoiceId}** PDF.`
    };
  })
  .build();

export let listSupplierInvoices = SlateTool.create(spec, {
  name: 'List Supplier Invoices',
  key: 'list_supplier_invoices',
  description:
    'List Tripletex supplier invoices for a required invoice date range with optional supplier, voucher, invoice number, pagination, sorting, and fields.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      id: z.string().optional().describe('Comma-separated supplier invoice ids'),
      invoiceDateFrom: z.string().describe('Invoice date from, inclusive, YYYY-MM-DD'),
      invoiceDateTo: z.string().describe('Invoice date to, exclusive, YYYY-MM-DD'),
      invoiceNumber: z.string().optional(),
      kid: z.string().optional(),
      voucherId: z.string().optional(),
      supplierId: z.string().optional(),
      ...pagingInputShape
    })
  )
  .output(
    z.object({ supplierInvoices: z.array(supplierInvoiceSchema), ...listMetadataSchema })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.list(
      '/supplierInvoice',
      {
        ...commonParams(ctx.input),
        id: ctx.input.id,
        invoiceDateFrom: ctx.input.invoiceDateFrom,
        invoiceDateTo: ctx.input.invoiceDateTo,
        invoiceNumber: ctx.input.invoiceNumber,
        kid: ctx.input.kid,
        voucherId: ctx.input.voucherId,
        supplierId: ctx.input.supplierId
      },
      companyIdFor(ctx, ctx.input.companyId)
    );
    let supplierInvoices = (response.values ?? []).map(mapSupplierInvoice);
    return {
      output: { supplierInvoices, ...listOutput(response) },
      message: `Found **${supplierInvoices.length}** Tripletex supplier invoice(s).`
    };
  })
  .build();

export let listSupplierInvoicesForApproval = SlateTool.create(spec, {
  name: 'List Supplier Invoices For Approval',
  key: 'list_supplier_invoices_for_approval',
  description:
    'List Tripletex supplier invoices currently available for approval, with optional search text, employee, show-all flag, pagination, sorting, and fields.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      searchText: z.string().optional(),
      showAll: z.boolean().optional(),
      employeeId: z.number().int().positive().optional(),
      ...pagingInputShape
    })
  )
  .output(
    z.object({ supplierInvoices: z.array(supplierInvoiceSchema), ...listMetadataSchema })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.list(
      '/supplierInvoice/forApproval',
      {
        ...commonParams(ctx.input),
        searchText: ctx.input.searchText,
        showAll: ctx.input.showAll,
        employeeId: ctx.input.employeeId
      },
      companyIdFor(ctx, ctx.input.companyId)
    );
    let supplierInvoices = (response.values ?? []).map(mapSupplierInvoice);

    return {
      output: { supplierInvoices, ...listOutput(response) },
      message: `Found **${supplierInvoices.length}** Tripletex supplier invoice(s) for approval.`
    };
  })
  .build();

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description:
    'List Tripletex orders for a required order date range with optional order number, customer, closed/subscription flags, pagination, sorting, and fields.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      id: z.string().optional().describe('Comma-separated order ids'),
      number: z.string().optional().describe('Order number'),
      customerId: z.string().optional().describe('Comma-separated customer ids'),
      orderDateFrom: z.string().describe('Order date from, inclusive, YYYY-MM-DD'),
      orderDateTo: z.string().describe('Order date to, exclusive, YYYY-MM-DD'),
      deliveryComment: z.string().optional(),
      isClosed: z.boolean().optional(),
      isSubscription: z.boolean().optional(),
      ...pagingInputShape
    })
  )
  .output(z.object({ orders: z.array(orderSchema), ...listMetadataSchema }))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.list(
      '/order',
      {
        ...commonParams(ctx.input),
        id: ctx.input.id,
        number: ctx.input.number,
        customerId: ctx.input.customerId,
        orderDateFrom: ctx.input.orderDateFrom,
        orderDateTo: ctx.input.orderDateTo,
        deliveryComment: ctx.input.deliveryComment,
        isClosed: ctx.input.isClosed,
        isSubscription: ctx.input.isSubscription
      },
      companyIdFor(ctx, ctx.input.companyId)
    );
    let orders = (response.values ?? []).map(mapOrder);
    return {
      output: { orders, ...listOutput(response) },
      message: `Found **${orders.length}** Tripletex order(s).`
    };
  })
  .build();

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description:
    'Create a Tripletex order with one or more order lines. Use invoice_order to turn the order into an invoice.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.number().int().positive().describe('Tripletex customer id'),
      orderDate: z.string().describe('Order date, YYYY-MM-DD'),
      orderLines: z.array(orderLineInputSchema).min(1).describe('Order lines to create'),
      number: z.string().optional().describe('Optional order number'),
      receiverEmail: z.string().optional(),
      contactId: z.number().int().positive().optional(),
      attentionContactId: z.number().int().positive().optional(),
      ourContactId: z.number().int().positive().optional(),
      ourContactEmployeeId: z.number().int().positive().optional(),
      departmentId: z.number().int().positive().optional(),
      projectId: z.number().int().positive().optional(),
      currencyId: z.number().int().positive().optional(),
      reference: z.string().optional(),
      contractReference: z.string().optional(),
      invoiceComment: z.string().optional(),
      internalComment: z.string().optional(),
      deliveryDate: z.string().optional(),
      deliveryComment: z.string().optional(),
      isSubscription: z.boolean().optional(),
      fields: pagingInputShape.fields,
      companyId: pagingInputShape.companyId
    })
  )
  .output(z.object({ order: orderSchema }))
  .handleInvocation(async ctx => {
    ensureOrderLines(ctx.input.orderLines);
    let client = createClient(ctx);
    let value = await client.createValue(
      '/order',
      pickDefined({
        customer: ref(ctx.input.customerId),
        orderDate: ctx.input.orderDate,
        orderLines: ctx.input.orderLines.map(orderLineBody),
        number: ctx.input.number,
        receiverEmail: ctx.input.receiverEmail,
        contact: ref(ctx.input.contactId),
        attn: ref(ctx.input.attentionContactId),
        ourContact: ref(ctx.input.ourContactId),
        ourContactEmployee: ref(ctx.input.ourContactEmployeeId),
        department: ref(ctx.input.departmentId),
        project: ref(ctx.input.projectId),
        currency: ref(ctx.input.currencyId),
        reference: ctx.input.reference,
        contractReference: ctx.input.contractReference,
        invoiceComment: ctx.input.invoiceComment,
        internalComment: ctx.input.internalComment,
        deliveryDate: ctx.input.deliveryDate,
        deliveryComment: ctx.input.deliveryComment,
        isSubscription: ctx.input.isSubscription
      }),
      { fields: ctx.input.fields },
      companyIdFor(ctx, ctx.input.companyId)
    );
    let order = mapOrder(value);
    return {
      output: { order },
      message: `Created Tripletex order **${order.number ?? order.id ?? 'new'}**.`
    };
  })
  .build();

export let invoiceOrder = SlateTool.create(spec, {
  name: 'Invoice Order',
  key: 'invoice_order',
  description:
    'Create a Tripletex invoice from an existing order. Sending to the customer is explicit and defaults to false.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.number().int().positive().describe('Tripletex order id'),
      invoiceDate: z.string().describe('Invoice date, YYYY-MM-DD'),
      sendToCustomer: z.boolean().optional().describe('Whether to send the invoice'),
      sendType: sendTypeSchema.optional().describe('Invoice send method'),
      paymentTypeId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Payment type for prepayment. Must be paired with paidAmount.'),
      paidAmount: z
        .number()
        .optional()
        .describe('Prepaid amount in invoice currency. Must be paired with paymentTypeId.'),
      overrideEmailAddress: z.string().optional(),
      fields: pagingInputShape.fields,
      companyId: pagingInputShape.companyId
    })
  )
  .output(z.object({ invoice: invoiceSchema }))
  .handleInvocation(async ctx => {
    ensurePaymentPair(ctx.input.paymentTypeId, ctx.input.paidAmount);
    ensureInvoiceSendOptions(ctx.input);

    let client = createClient(ctx);
    let value = await client.updateValue(
      `/order/${ctx.input.orderId}/:invoice`,
      {},
      {
        invoiceDate: ctx.input.invoiceDate,
        sendToCustomer: ctx.input.sendToCustomer ?? false,
        sendType: ctx.input.sendType,
        paymentTypeId: ctx.input.paymentTypeId,
        paidAmount: ctx.input.paidAmount,
        overrideEmailAddress: ctx.input.overrideEmailAddress,
        fields: ctx.input.fields
      },
      companyIdFor(ctx, ctx.input.companyId)
    );
    let invoice = mapInvoice(value);
    return {
      output: { invoice },
      message: `Created Tripletex invoice **${invoice.invoiceNumber ?? invoice.id ?? 'new'}** from order **${ctx.input.orderId}**.`
    };
  })
  .build();

export let getSupplierInvoicePdf = SlateTool.create(spec, {
  name: 'Get Supplier Invoice PDF',
  key: 'get_supplier_invoice_pdf',
  description:
    'Download a Tripletex supplier invoice PDF by supplier invoice id and return it as a Slate attachment.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.number().int().positive().describe('Tripletex supplier invoice id'),
      companyId: pagingInputShape.companyId
    })
  )
  .output(pdfOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let pdf = await client.downloadPdf(
      `/supplierInvoice/${ctx.input.invoiceId}/pdf`,
      companyIdFor(ctx, ctx.input.companyId)
    );
    let filename = `tripletex-supplier-invoice-${ctx.input.invoiceId}.pdf`;
    return {
      output: {
        resourceId: ctx.input.invoiceId,
        filename,
        mimeType: pdf.mimeType,
        byteLength: pdf.byteLength,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(pdf.contentBase64, pdf.mimeType)],
      message: `Downloaded Tripletex supplier invoice **${ctx.input.invoiceId}** PDF.`
    };
  })
  .build();

export let listVouchers = SlateTool.create(spec, {
  name: 'List Vouchers',
  key: 'list_vouchers',
  description:
    'List Tripletex vouchers for a required voucher date range with optional id, number, type, pagination, sorting, and fields.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      id: z.string().optional().describe('Comma-separated voucher ids'),
      number: z.string().optional().describe('Comma-separated voucher numbers'),
      numberFrom: z.number().int().optional(),
      numberTo: z.number().int().optional(),
      typeId: z.string().optional().describe('Comma-separated voucher type ids'),
      dateFrom: z.string().describe('Voucher date from, inclusive, YYYY-MM-DD'),
      dateTo: z.string().describe('Voucher date to, exclusive, YYYY-MM-DD'),
      ...pagingInputShape
    })
  )
  .output(z.object({ vouchers: z.array(voucherSchema), ...listMetadataSchema }))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.list(
      '/ledger/voucher',
      {
        ...commonParams(ctx.input),
        id: ctx.input.id,
        number: ctx.input.number,
        numberFrom: ctx.input.numberFrom,
        numberTo: ctx.input.numberTo,
        typeId: ctx.input.typeId,
        dateFrom: ctx.input.dateFrom,
        dateTo: ctx.input.dateTo
      },
      companyIdFor(ctx, ctx.input.companyId)
    );
    let vouchers = (response.values ?? []).map(mapVoucher);
    return {
      output: { vouchers, ...listOutput(response) },
      message: `Found **${vouchers.length}** Tripletex voucher(s).`
    };
  })
  .build();

export let createVoucher = SlateTool.create(spec, {
  name: 'Create Voucher',
  key: 'create_voucher',
  description:
    'Create a Tripletex ledger voucher with explicit postings. The postings must balance according to Tripletex accounting rules.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      date: z.string().describe('Voucher date, YYYY-MM-DD'),
      description: z.string().optional(),
      voucherTypeId: z.number().int().positive().optional(),
      vendorInvoiceNumber: z.string().optional(),
      postings: z
        .array(voucherPostingInputSchema)
        .min(2)
        .describe('Voucher postings. Row 0 is reserved by Tripletex; rows default to 1..n.'),
      sendToLedger: z
        .boolean()
        .optional()
        .describe('Whether to send the voucher to the ledger. Defaults to true.'),
      fields: pagingInputShape.fields,
      companyId: pagingInputShape.companyId
    })
  )
  .output(z.object({ voucher: voucherSchema }))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let value = await client.createValue(
      '/ledger/voucher',
      pickDefined({
        date: ctx.input.date,
        description: ctx.input.description,
        voucherType: ref(ctx.input.voucherTypeId),
        vendorInvoiceNumber: ctx.input.vendorInvoiceNumber,
        postings: ctx.input.postings.map(voucherPostingBody)
      }),
      {
        sendToLedger: ctx.input.sendToLedger ?? true,
        fields: ctx.input.fields
      },
      companyIdFor(ctx, ctx.input.companyId)
    );
    let voucher = mapVoucher(value);
    return {
      output: { voucher },
      message: `Created Tripletex voucher **${voucher.numberAsString ?? voucher.id ?? 'new'}**.`
    };
  })
  .build();

export let getVoucherPdf = SlateTool.create(spec, {
  name: 'Get Voucher PDF',
  key: 'get_voucher_pdf',
  description:
    'Download a Tripletex ledger voucher PDF by voucher id and return it as a Slate attachment.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      voucherId: z.number().int().positive().describe('Tripletex voucher id'),
      companyId: pagingInputShape.companyId
    })
  )
  .output(pdfOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let pdf = await client.downloadPdf(
      `/ledger/voucher/${ctx.input.voucherId}/pdf`,
      companyIdFor(ctx, ctx.input.companyId)
    );
    let filename = `tripletex-voucher-${ctx.input.voucherId}.pdf`;
    return {
      output: {
        resourceId: ctx.input.voucherId,
        filename,
        mimeType: pdf.mimeType,
        byteLength: pdf.byteLength,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(pdf.contentBase64, pdf.mimeType)],
      message: `Downloaded Tripletex voucher **${ctx.input.voucherId}** PDF.`
    };
  })
  .build();

export let deleteVoucher = SlateTool.create(spec, {
  name: 'Delete Voucher',
  key: 'delete_voucher',
  description: 'Delete a Tripletex ledger voucher by id.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      voucherId: z.number().int().positive().describe('Tripletex voucher id to delete.'),
      companyId: pagingInputShape.companyId
    })
  )
  .output(
    z.object({
      voucherId: z.number().describe('Deleted Tripletex voucher id')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.delete(
      `/ledger/voucher/${ctx.input.voucherId}`,
      companyIdFor(ctx, ctx.input.companyId)
    );

    return {
      output: {
        voucherId: ctx.input.voucherId
      },
      message: `Deleted Tripletex voucher **${ctx.input.voucherId}**.`
    };
  })
  .build();

export let listPostingsByDate = SlateTool.create(spec, {
  name: 'List Postings By Date',
  key: 'list_postings_by_date',
  description:
    'List Tripletex ledger postings by required posting date range. This uses the optimized /ledger/postingByDate endpoint for sync workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z.string().describe('Posting date from, inclusive, YYYY-MM-DD'),
      dateTo: z.string().describe('Posting date to, exclusive, YYYY-MM-DD'),
      ...pagingInputShape
    })
  )
  .output(z.object({ postings: z.array(postingSchema), ...listMetadataSchema }))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.list(
      '/ledger/postingByDate',
      {
        ...commonParams(ctx.input),
        dateFrom: ctx.input.dateFrom,
        dateTo: ctx.input.dateTo
      },
      companyIdFor(ctx, ctx.input.companyId)
    );
    let postings = (response.values ?? []).map(mapPosting);
    return {
      output: { postings, ...listOutput(response) },
      message: `Found **${postings.length}** Tripletex posting(s).`
    };
  })
  .build();

export let getBalanceSheet = SlateTool.create(spec, {
  name: 'Get Balance Sheet',
  key: 'get_balance_sheet',
  description:
    'Get Tripletex balance sheet account balances for a required date range with optional account, customer, employee, department, project, and pagination filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z.string().describe('Date from, inclusive, YYYY-MM-DD'),
      dateTo: z.string().describe('Date to, exclusive, YYYY-MM-DD'),
      accountNumberFrom: z.number().int().optional(),
      accountNumberTo: z.number().int().optional(),
      customerId: z.number().int().positive().optional(),
      employeeId: z.number().int().positive().optional(),
      departmentId: z.number().int().positive().optional(),
      projectId: z.number().int().positive().optional(),
      includeSubProjects: z.boolean().optional(),
      includeActiveAccountsWithoutMovements: z.boolean().optional(),
      ...pagingInputShape
    })
  )
  .output(z.object({ accounts: z.array(balanceSheetAccountSchema), ...listMetadataSchema }))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.list(
      '/balanceSheet',
      {
        ...commonParams(ctx.input),
        dateFrom: ctx.input.dateFrom,
        dateTo: ctx.input.dateTo,
        accountNumberFrom: ctx.input.accountNumberFrom,
        accountNumberTo: ctx.input.accountNumberTo,
        customerId: ctx.input.customerId,
        employeeId: ctx.input.employeeId,
        departmentId: ctx.input.departmentId,
        projectId: ctx.input.projectId,
        includeSubProjects: ctx.input.includeSubProjects,
        includeActiveAccountsWithoutMovements: ctx.input.includeActiveAccountsWithoutMovements
      },
      companyIdFor(ctx, ctx.input.companyId)
    );
    let accounts = (response.values ?? []).map(mapBalanceSheetAccount);
    return {
      output: { accounts, ...listOutput(response) },
      message: `Found **${accounts.length}** Tripletex balance sheet account row(s).`
    };
  })
  .build();
