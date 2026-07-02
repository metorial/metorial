import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { businessCentralEntityPath } from '../../lib/business-central/client';
import { spec } from '../../spec';
import {
  type BusinessCentralContext,
  booleanValue,
  buildODataParams,
  compactRecord,
  companyInputFields,
  companyPath,
  createClient,
  dateFromFilter,
  dateToFilter,
  dimensionSetLineSchema,
  equalityFilter,
  expandedListInputFields,
  mapDimensionSetLines,
  nestedODataRecords,
  numberValue,
  type ODataInput,
  pageOutputSchema,
  pageSummary,
  rawEqualityFilter,
  rawRecordSchema,
  resolveCompanyId,
  stringValue
} from './shared';

type InvoiceContext = BusinessCentralContext & {
  input: BusinessCentralContext['input'] &
    ODataInput & {
      invoiceId?: string;
      purchaseInvoiceId?: string;
      customerId?: string;
      vendorId?: string;
      status?: string;
      invoiceDateFrom?: string;
      invoiceDateTo?: string;
      postingDateFrom?: string;
      postingDateTo?: string;
      dueDateFrom?: string;
      dueDateTo?: string;
      updatedSince?: string;
      expandLines?: boolean;
      expandCustomer?: boolean;
      expandVendor?: boolean;
      expandDimensions?: boolean;
      expandAttachments?: boolean;
      expandPdfDocument?: boolean;
      acceptLanguage?: string;
      fileName?: string;
    };
};

let invoiceLineBaseSchema = z.object({
  id: z.string().optional(),
  documentId: z.string().optional(),
  sequence: z.number().optional(),
  itemId: z.string().optional(),
  accountId: z.string().optional(),
  lineType: z.string().optional(),
  lineObjectNumber: z.string().optional(),
  description: z.string().optional(),
  description2: z.string().optional(),
  unitOfMeasureId: z.string().optional(),
  unitOfMeasureCode: z.string().optional(),
  quantity: z.number().optional(),
  discountAmount: z.number().optional(),
  discountPercent: z.number().optional(),
  discountAppliedBeforeTax: z.boolean().optional(),
  taxCode: z.string().optional(),
  taxPercent: z.number().optional(),
  totalTaxAmount: z.number().optional(),
  amountExcludingTax: z.number().optional(),
  amountIncludingTax: z.number().optional(),
  invoiceDiscountAllocation: z.number().optional(),
  netAmount: z.number().optional(),
  netTaxAmount: z.number().optional(),
  netAmountIncludingTax: z.number().optional(),
  itemVariantId: z.string().optional(),
  locationId: z.string().optional(),
  record: rawRecordSchema
});

let salesInvoiceLineSchema = invoiceLineBaseSchema.extend({
  unitPrice: z.number().optional(),
  shipmentDate: z.string().optional()
});

let purchaseInvoiceLineSchema = invoiceLineBaseSchema.extend({
  unitCost: z.number().optional(),
  expectedReceiptDate: z.string().optional()
});

let salesInvoiceSchema = z.object({
  id: z.string().optional().describe('Business Central sales invoice GUID.'),
  number: z.string().optional().describe('Sales invoice number.'),
  externalDocumentNumber: z.string().optional(),
  customerId: z.string().optional(),
  customerNumber: z.string().optional(),
  customerName: z.string().optional(),
  billToCustomerId: z.string().optional(),
  billToName: z.string().optional(),
  invoiceDate: z.string().optional(),
  postingDate: z.string().optional(),
  dueDate: z.string().optional(),
  promisedPayDate: z.string().optional(),
  customerPurchaseOrderReference: z.string().optional(),
  billToCustomerNumber: z.string().optional(),
  shipToName: z.string().optional(),
  shipToContact: z.string().optional(),
  sellToAddressLine1: z.string().optional(),
  sellToAddressLine2: z.string().optional(),
  sellToCity: z.string().optional(),
  sellToCountry: z.string().optional(),
  sellToState: z.string().optional(),
  sellToPostCode: z.string().optional(),
  billToAddressLine1: z.string().optional(),
  billToAddressLine2: z.string().optional(),
  billToCity: z.string().optional(),
  billToCountry: z.string().optional(),
  billToState: z.string().optional(),
  billToPostCode: z.string().optional(),
  shipToAddressLine1: z.string().optional(),
  shipToAddressLine2: z.string().optional(),
  shipToCity: z.string().optional(),
  shipToCountry: z.string().optional(),
  shipToState: z.string().optional(),
  shipToPostCode: z.string().optional(),
  currencyId: z.string().optional(),
  currencyCode: z.string().optional(),
  shortcutDimension1Code: z.string().optional(),
  shortcutDimension2Code: z.string().optional(),
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),
  paymentTermsId: z.string().optional(),
  shipmentMethodId: z.string().optional(),
  salesperson: z.string().optional(),
  disputeStatusId: z.string().optional(),
  disputeStatus: z.string().optional(),
  pricesIncludeTax: z.boolean().optional(),
  discountAmount: z.number().optional(),
  discountAppliedBeforeTax: z.boolean().optional(),
  totalAmountExcludingTax: z.number().optional(),
  totalTaxAmount: z.number().optional(),
  totalAmountIncludingTax: z.number().optional(),
  remainingAmount: z.number().optional(),
  status: z.string().optional(),
  lastModifiedDateTime: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  lines: z.array(salesInvoiceLineSchema).optional(),
  dimensions: z.array(dimensionSetLineSchema).optional(),
  record: rawRecordSchema
});

let purchaseInvoiceSchema = z.object({
  id: z.string().optional().describe('Business Central purchase invoice GUID.'),
  number: z.string().optional().describe('Purchase invoice number.'),
  vendorInvoiceNumber: z.string().optional(),
  vendorId: z.string().optional(),
  vendorNumber: z.string().optional(),
  vendorName: z.string().optional(),
  payToVendorId: z.string().optional(),
  payToName: z.string().optional(),
  payToContact: z.string().optional(),
  payToVendorNumber: z.string().optional(),
  shipToName: z.string().optional(),
  shipToContact: z.string().optional(),
  buyFromAddressLine1: z.string().optional(),
  buyFromAddressLine2: z.string().optional(),
  buyFromCity: z.string().optional(),
  buyFromCountry: z.string().optional(),
  buyFromState: z.string().optional(),
  buyFromPostCode: z.string().optional(),
  shipToAddressLine1: z.string().optional(),
  shipToAddressLine2: z.string().optional(),
  shipToCity: z.string().optional(),
  shipToCountry: z.string().optional(),
  shipToState: z.string().optional(),
  shipToPostCode: z.string().optional(),
  payToAddressLine1: z.string().optional(),
  payToAddressLine2: z.string().optional(),
  payToCity: z.string().optional(),
  payToCountry: z.string().optional(),
  payToState: z.string().optional(),
  payToPostCode: z.string().optional(),
  invoiceDate: z.string().optional(),
  postingDate: z.string().optional(),
  dueDate: z.string().optional(),
  currencyId: z.string().optional(),
  currencyCode: z.string().optional(),
  shortcutDimension1Code: z.string().optional(),
  shortcutDimension2Code: z.string().optional(),
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),
  purchaser: z.string().optional(),
  pricesIncludeTax: z.boolean().optional(),
  discountAmount: z.number().optional(),
  discountAppliedBeforeTax: z.boolean().optional(),
  totalAmountExcludingTax: z.number().optional(),
  totalTaxAmount: z.number().optional(),
  totalAmountIncludingTax: z.number().optional(),
  status: z.string().optional(),
  lastModifiedDateTime: z.string().optional(),
  lines: z.array(purchaseInvoiceLineSchema).optional(),
  dimensions: z.array(dimensionSetLineSchema).optional(),
  record: rawRecordSchema
});

let ATTACHMENT_CONTENT_FIELD = 'attachmentContent';
let EXPANDED_ATTACHMENT_FIELDS = ['attachments', 'documentAttachments'] as const;

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let stripAttachmentContent = (value: unknown) => {
  if (
    !isRecord(value) ||
    !Object.prototype.hasOwnProperty.call(value, ATTACHMENT_CONTENT_FIELD)
  ) {
    return value;
  }

  let sanitized = { ...value };
  delete sanitized[ATTACHMENT_CONTENT_FIELD];
  return sanitized;
};

let sanitizeExpandedAttachmentCollection = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripAttachmentContent);
  if (isRecord(value) && Array.isArray(value.value)) {
    return {
      ...value,
      value: value.value.map(stripAttachmentContent)
    };
  }

  return value;
};

let sanitizeInvoiceRecord = (record: Record<string, unknown>) => {
  let sanitized = record;

  for (let field of EXPANDED_ATTACHMENT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) continue;
    if (sanitized === record) sanitized = { ...record };
    sanitized[field] = sanitizeExpandedAttachmentCollection(record[field]);
  }

  return sanitized;
};

let mapInvoiceLineBase = (record: Record<string, unknown>) =>
  compactRecord({
    id: stringValue(record, 'id'),
    documentId: stringValue(record, 'documentId'),
    sequence: numberValue(record, 'sequence'),
    itemId: stringValue(record, 'itemId'),
    accountId: stringValue(record, 'accountId'),
    lineType: stringValue(record, 'lineType'),
    lineObjectNumber: stringValue(record, 'lineObjectNumber'),
    description: stringValue(record, 'description'),
    description2: stringValue(record, 'description2'),
    unitOfMeasureId: stringValue(record, 'unitOfMeasureId'),
    unitOfMeasureCode: stringValue(record, 'unitOfMeasureCode'),
    quantity: numberValue(record, 'quantity'),
    discountAmount: numberValue(record, 'discountAmount'),
    discountPercent: numberValue(record, 'discountPercent'),
    discountAppliedBeforeTax: booleanValue(record, 'discountAppliedBeforeTax'),
    taxCode: stringValue(record, 'taxCode'),
    taxPercent: numberValue(record, 'taxPercent'),
    totalTaxAmount: numberValue(record, 'totalTaxAmount'),
    amountExcludingTax: numberValue(record, 'amountExcludingTax'),
    amountIncludingTax: numberValue(record, 'amountIncludingTax'),
    invoiceDiscountAllocation: numberValue(record, 'invoiceDiscountAllocation'),
    netAmount: numberValue(record, 'netAmount'),
    netTaxAmount: numberValue(record, 'netTaxAmount'),
    netAmountIncludingTax: numberValue(record, 'netAmountIncludingTax'),
    itemVariantId: stringValue(record, 'itemVariantId'),
    locationId: stringValue(record, 'locationId')
  });

let mapSalesInvoiceLine = (record: Record<string, unknown>) => ({
  ...mapInvoiceLineBase(record),
  ...compactRecord({
    unitPrice: numberValue(record, 'unitPrice'),
    shipmentDate: stringValue(record, 'shipmentDate')
  }),
  record
});

let mapPurchaseInvoiceLine = (record: Record<string, unknown>) => ({
  ...mapInvoiceLineBase(record),
  ...compactRecord({
    unitCost: numberValue(record, 'unitCost'),
    expectedReceiptDate: stringValue(record, 'expectedReceiptDate')
  }),
  record
});

let mapSalesInvoice = (record: Record<string, unknown>) => ({
  ...compactRecord({
    id: stringValue(record, 'id'),
    number: stringValue(record, 'number'),
    externalDocumentNumber: stringValue(record, 'externalDocumentNumber'),
    customerId: stringValue(record, 'customerId'),
    customerNumber: stringValue(record, 'customerNumber'),
    customerName: stringValue(record, 'customerName'),
    billToCustomerId: stringValue(record, 'billToCustomerId'),
    billToName: stringValue(record, 'billToName'),
    invoiceDate: stringValue(record, 'invoiceDate'),
    postingDate: stringValue(record, 'postingDate'),
    dueDate: stringValue(record, 'dueDate'),
    promisedPayDate: stringValue(record, 'promisedPayDate'),
    customerPurchaseOrderReference: stringValue(record, 'customerPurchaseOrderReference'),
    billToCustomerNumber: stringValue(record, 'billToCustomerNumber'),
    shipToName: stringValue(record, 'shipToName'),
    shipToContact: stringValue(record, 'shipToContact'),
    sellToAddressLine1: stringValue(record, 'sellToAddressLine1'),
    sellToAddressLine2: stringValue(record, 'sellToAddressLine2'),
    sellToCity: stringValue(record, 'sellToCity'),
    sellToCountry: stringValue(record, 'sellToCountry'),
    sellToState: stringValue(record, 'sellToState'),
    sellToPostCode: stringValue(record, 'sellToPostCode'),
    billToAddressLine1: stringValue(record, 'billToAddressLine1'),
    billToAddressLine2: stringValue(record, 'billToAddressLine2'),
    billToCity: stringValue(record, 'billToCity'),
    billToCountry: stringValue(record, 'billToCountry'),
    billToState: stringValue(record, 'billToState'),
    billToPostCode: stringValue(record, 'billToPostCode'),
    shipToAddressLine1: stringValue(record, 'shipToAddressLine1'),
    shipToAddressLine2: stringValue(record, 'shipToAddressLine2'),
    shipToCity: stringValue(record, 'shipToCity'),
    shipToCountry: stringValue(record, 'shipToCountry'),
    shipToState: stringValue(record, 'shipToState'),
    shipToPostCode: stringValue(record, 'shipToPostCode'),
    currencyId: stringValue(record, 'currencyId'),
    currencyCode: stringValue(record, 'currencyCode'),
    shortcutDimension1Code: stringValue(record, 'shortcutDimension1Code'),
    shortcutDimension2Code: stringValue(record, 'shortcutDimension2Code'),
    orderId: stringValue(record, 'orderId'),
    orderNumber: stringValue(record, 'orderNumber'),
    paymentTermsId: stringValue(record, 'paymentTermsId'),
    shipmentMethodId: stringValue(record, 'shipmentMethodId'),
    salesperson: stringValue(record, 'salesperson'),
    disputeStatusId: stringValue(record, 'disputeStatusId'),
    disputeStatus: stringValue(record, 'disputeStatus'),
    pricesIncludeTax: booleanValue(record, 'pricesIncludeTax'),
    discountAmount: numberValue(record, 'discountAmount'),
    discountAppliedBeforeTax: booleanValue(record, 'discountAppliedBeforeTax'),
    totalAmountExcludingTax: numberValue(record, 'totalAmountExcludingTax'),
    totalTaxAmount: numberValue(record, 'totalTaxAmount'),
    totalAmountIncludingTax: numberValue(record, 'totalAmountIncludingTax'),
    remainingAmount: numberValue(record, 'remainingAmount'),
    status: stringValue(record, 'status'),
    lastModifiedDateTime: stringValue(record, 'lastModifiedDateTime'),
    phoneNumber: stringValue(record, 'phoneNumber'),
    email: stringValue(record, 'email'),
    lines: nestedODataRecords(record, 'salesInvoiceLines', 'lines')?.map(mapSalesInvoiceLine),
    dimensions: mapDimensionSetLines(nestedODataRecords(record, 'dimensionSetLines'))
  }),
  record: sanitizeInvoiceRecord(record)
});

let mapPurchaseInvoice = (record: Record<string, unknown>) => ({
  ...compactRecord({
    id: stringValue(record, 'id'),
    number: stringValue(record, 'number'),
    vendorInvoiceNumber: stringValue(record, 'vendorInvoiceNumber'),
    vendorId: stringValue(record, 'vendorId'),
    vendorNumber: stringValue(record, 'vendorNumber'),
    vendorName: stringValue(record, 'vendorName'),
    payToVendorId: stringValue(record, 'payToVendorId'),
    payToName: stringValue(record, 'payToName'),
    payToContact: stringValue(record, 'payToContact'),
    payToVendorNumber: stringValue(record, 'payToVendorNumber'),
    shipToName: stringValue(record, 'shipToName'),
    shipToContact: stringValue(record, 'shipToContact'),
    buyFromAddressLine1: stringValue(record, 'buyFromAddressLine1'),
    buyFromAddressLine2: stringValue(record, 'buyFromAddressLine2'),
    buyFromCity: stringValue(record, 'buyFromCity'),
    buyFromCountry: stringValue(record, 'buyFromCountry'),
    buyFromState: stringValue(record, 'buyFromState'),
    buyFromPostCode: stringValue(record, 'buyFromPostCode'),
    shipToAddressLine1: stringValue(record, 'shipToAddressLine1'),
    shipToAddressLine2: stringValue(record, 'shipToAddressLine2'),
    shipToCity: stringValue(record, 'shipToCity'),
    shipToCountry: stringValue(record, 'shipToCountry'),
    shipToState: stringValue(record, 'shipToState'),
    shipToPostCode: stringValue(record, 'shipToPostCode'),
    payToAddressLine1: stringValue(record, 'payToAddressLine1'),
    payToAddressLine2: stringValue(record, 'payToAddressLine2'),
    payToCity: stringValue(record, 'payToCity'),
    payToCountry: stringValue(record, 'payToCountry'),
    payToState: stringValue(record, 'payToState'),
    payToPostCode: stringValue(record, 'payToPostCode'),
    invoiceDate: stringValue(record, 'invoiceDate'),
    postingDate: stringValue(record, 'postingDate'),
    dueDate: stringValue(record, 'dueDate'),
    currencyId: stringValue(record, 'currencyId'),
    currencyCode: stringValue(record, 'currencyCode'),
    shortcutDimension1Code: stringValue(record, 'shortcutDimension1Code'),
    shortcutDimension2Code: stringValue(record, 'shortcutDimension2Code'),
    orderId: stringValue(record, 'orderId'),
    orderNumber: stringValue(record, 'orderNumber'),
    purchaser: stringValue(record, 'purchaser'),
    pricesIncludeTax: booleanValue(record, 'pricesIncludeTax'),
    discountAmount: numberValue(record, 'discountAmount'),
    discountAppliedBeforeTax: booleanValue(record, 'discountAppliedBeforeTax'),
    totalAmountExcludingTax: numberValue(record, 'totalAmountExcludingTax'),
    totalTaxAmount: numberValue(record, 'totalTaxAmount'),
    totalAmountIncludingTax: numberValue(record, 'totalAmountIncludingTax'),
    status: stringValue(record, 'status'),
    lastModifiedDateTime: stringValue(record, 'lastModifiedDateTime'),
    lines: nestedODataRecords(record, 'purchaseInvoiceLines', 'lines')?.map(
      mapPurchaseInvoiceLine
    ),
    dimensions: mapDimensionSetLines(nestedODataRecords(record, 'dimensionSetLines'))
  }),
  record: sanitizeInvoiceRecord(record)
});

let invoiceFilters = (
  input: InvoiceContext['input'],
  params: {
    partyField: 'customerId' | 'vendorId';
    partyId?: string;
  }
) => [
  equalityFilter('status', input.status),
  rawEqualityFilter(params.partyField, params.partyId),
  dateFromFilter('invoiceDate', input.invoiceDateFrom),
  dateToFilter('invoiceDate', input.invoiceDateTo),
  dateFromFilter('postingDate', input.postingDateFrom),
  dateToFilter('postingDate', input.postingDateTo),
  dateFromFilter('dueDate', input.dueDateFrom),
  dateToFilter('dueDate', input.dueDateTo),
  dateFromFilter('lastModifiedDateTime', input.updatedSince)
];

let salesExpand = (input: InvoiceContext['input']) => [
  ...(input.expandLines ? ['salesInvoiceLines'] : []),
  ...(input.expandCustomer ? ['customer'] : []),
  ...(input.expandDimensions ? ['dimensionSetLines'] : []),
  ...(input.expandPdfDocument ? ['pdfDocument'] : []),
  ...(input.expandAttachments ? ['attachments', 'documentAttachments'] : []),
  ...(input.expand ?? [])
];

let purchaseExpand = (input: InvoiceContext['input']) => [
  ...(input.expandLines ? ['purchaseInvoiceLines'] : []),
  ...(input.expandVendor ? ['vendor'] : []),
  ...(input.expandDimensions ? ['dimensionSetLines'] : []),
  ...(input.expandAttachments ? ['attachments', 'documentAttachments'] : []),
  ...(input.expand ?? [])
];

export let salesInvoicePdfContentPath = (companyId: string, invoiceId: string) =>
  `/${companyPath(companyId)}/${businessCentralEntityPath(
    'salesInvoices',
    invoiceId
  )}/pdfDocument/pdfDocumentContent`;

export let listSalesInvoices = SlateTool.create(spec, {
  name: 'List Business Central Sales Invoices',
  key: 'list_sales_invoices',
  description:
    'List Business Central sales invoices by customer, status, invoice/posting/due dates, update timestamp, and OData filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      ...expandedListInputFields,
      customerId: z.string().optional().describe('Filter by Business Central customer GUID.'),
      status: z.string().optional().describe('Filter by upstream invoice status.'),
      invoiceDateFrom: z.string().optional().describe('Minimum invoiceDate.'),
      invoiceDateTo: z.string().optional().describe('Maximum invoiceDate.'),
      postingDateFrom: z.string().optional().describe('Minimum postingDate.'),
      postingDateTo: z.string().optional().describe('Maximum postingDate.'),
      dueDateFrom: z.string().optional().describe('Minimum dueDate.'),
      dueDateTo: z.string().optional().describe('Maximum dueDate.'),
      updatedSince: z
        .string()
        .optional()
        .describe('Return invoices modified at or after this ISO timestamp.'),
      expandLines: z
        .boolean()
        .optional()
        .describe('Expand salesInvoiceLines navigation data.'),
      expandCustomer: z.boolean().optional().describe('Expand customer navigation data.')
    })
  )
  .output(
    z.object({
      salesInvoices: z
        .array(salesInvoiceSchema)
        .describe('Sales invoice records returned by Business Central.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async rawCtx => {
    let ctx = rawCtx as InvoiceContext;
    let client = createClient(ctx);
    let companyId = resolveCompanyId(ctx);
    let { params, page } = buildODataParams(
      ctx,
      { ...ctx.input, expand: salesExpand(ctx.input) },
      invoiceFilters(ctx.input, {
        partyField: 'customerId',
        partyId: ctx.input.customerId
      })
    );
    let response = await client.getList<Record<string, unknown>>(
      'list sales invoices',
      `/${companyPath(companyId)}/salesInvoices`,
      params
    );
    let salesInvoices = response.value!.map(mapSalesInvoice);

    return {
      output: {
        salesInvoices,
        page: pageSummary(response, page)
      },
      message: `Found **${salesInvoices.length}** Business Central sales invoice record(s).`
    };
  })
  .build();

export let getSalesInvoice = SlateTool.create(spec, {
  name: 'Get Business Central Sales Invoice',
  key: 'get_sales_invoice',
  description:
    'Retrieve one Business Central sales invoice by GUID with optional lines, customer, dimensions, PDF metadata, and attachment navigation expansion.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      invoiceId: z.string().describe('Business Central sales invoice GUID.'),
      select: z.array(z.string()).optional().describe('Optional OData $select fields.'),
      expand: z.array(z.string()).optional().describe('Optional OData $expand fields.'),
      expandLines: z
        .boolean()
        .optional()
        .describe('Expand salesInvoiceLines navigation data.'),
      expandCustomer: z.boolean().optional().describe('Expand customer navigation data.'),
      expandDimensions: z.boolean().optional().describe('Expand dimensionSetLines.'),
      expandPdfDocument: z.boolean().optional().describe('Expand pdfDocument metadata.'),
      expandAttachments: z
        .boolean()
        .optional()
        .describe('Expand attachments and documentAttachments metadata.')
    })
  )
  .output(salesInvoiceSchema)
  .handleInvocation(async rawCtx => {
    let ctx = rawCtx as InvoiceContext;
    let client = createClient(ctx);
    let companyId = resolveCompanyId(ctx);
    let params = compactRecord({
      $select: ctx.input.select?.join(','),
      $expand: salesExpand(ctx.input).join(',') || undefined
    });
    let record = await client.getData<Record<string, unknown>>(
      'get sales invoice',
      `/${companyPath(companyId)}/${businessCentralEntityPath('salesInvoices', ctx.input.invoiceId!)}`,
      params
    );
    let invoice = mapSalesInvoice(record);

    return {
      output: invoice,
      message: `Retrieved Business Central sales invoice **${invoice.number ?? ctx.input.invoiceId}**.`
    };
  })
  .build();

export let getSalesInvoicePdf = SlateTool.create(spec, {
  name: 'Get Business Central Sales Invoice PDF',
  key: 'get_sales_invoice_pdf',
  description:
    'Download a Business Central sales invoice PDF as a Slate attachment. JSON output contains metadata only, never file bytes.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      invoiceId: z.string().describe('Business Central sales invoice GUID.'),
      acceptLanguage: z
        .string()
        .optional()
        .describe('Optional Accept-Language header for localized PDF output.'),
      fileName: z.string().optional().describe('Optional filename metadata for the PDF.')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('Business Central company GUID.'),
      invoiceId: z.string().describe('Business Central sales invoice GUID.'),
      fileName: z.string().describe('Suggested PDF filename.'),
      mimeType: z.string().describe('Downloaded PDF MIME type.'),
      size: z.number().describe('Downloaded PDF byte size.'),
      attachmentCount: z.number().describe('Number of Slate attachments returned.')
    })
  )
  .handleInvocation(async rawCtx => {
    let ctx = rawCtx as InvoiceContext;
    let client = createClient(ctx);
    let companyId = resolveCompanyId(ctx);
    let invoiceId = ctx.input.invoiceId!;
    let file = await client.downloadFile(
      'download sales invoice PDF',
      salesInvoicePdfContentPath(companyId, invoiceId),
      {
        acceptLanguage: ctx.input.acceptLanguage
      }
    );
    let fileName = ctx.input.fileName ?? `business-central-sales-invoice-${invoiceId}.pdf`;

    return {
      output: {
        companyId,
        invoiceId,
        fileName,
        mimeType: file.mimeType,
        size: file.size,
        attachmentCount: 1
      },
      message: `Downloaded Business Central sales invoice PDF **${fileName}**.`,
      attachments: [createBase64Attachment(file.contentBase64, file.mimeType)]
    };
  })
  .build();

export let listPurchaseInvoices = SlateTool.create(spec, {
  name: 'List Business Central Purchase Invoices',
  key: 'list_purchase_invoices',
  description:
    'List Business Central purchase invoices by vendor, status, invoice/posting/due dates, update timestamp, and OData filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      ...expandedListInputFields,
      vendorId: z.string().optional().describe('Filter by Business Central vendor GUID.'),
      status: z.string().optional().describe('Filter by upstream invoice status.'),
      invoiceDateFrom: z.string().optional().describe('Minimum invoiceDate.'),
      invoiceDateTo: z.string().optional().describe('Maximum invoiceDate.'),
      postingDateFrom: z.string().optional().describe('Minimum postingDate.'),
      postingDateTo: z.string().optional().describe('Maximum postingDate.'),
      dueDateFrom: z.string().optional().describe('Minimum dueDate.'),
      dueDateTo: z.string().optional().describe('Maximum dueDate.'),
      updatedSince: z
        .string()
        .optional()
        .describe('Return invoices modified at or after this ISO timestamp.'),
      expandLines: z
        .boolean()
        .optional()
        .describe('Expand purchaseInvoiceLines navigation data.'),
      expandVendor: z.boolean().optional().describe('Expand vendor navigation data.')
    })
  )
  .output(
    z.object({
      purchaseInvoices: z
        .array(purchaseInvoiceSchema)
        .describe('Purchase invoice records returned by Business Central.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async rawCtx => {
    let ctx = rawCtx as InvoiceContext;
    let client = createClient(ctx);
    let companyId = resolveCompanyId(ctx);
    let { params, page } = buildODataParams(
      ctx,
      { ...ctx.input, expand: purchaseExpand(ctx.input) },
      invoiceFilters(ctx.input, {
        partyField: 'vendorId',
        partyId: ctx.input.vendorId
      })
    );
    let response = await client.getList<Record<string, unknown>>(
      'list purchase invoices',
      `/${companyPath(companyId)}/purchaseInvoices`,
      params
    );
    let purchaseInvoices = response.value!.map(mapPurchaseInvoice);

    return {
      output: {
        purchaseInvoices,
        page: pageSummary(response, page)
      },
      message: `Found **${purchaseInvoices.length}** Business Central purchase invoice record(s).`
    };
  })
  .build();

export let getPurchaseInvoice = SlateTool.create(spec, {
  name: 'Get Business Central Purchase Invoice',
  key: 'get_purchase_invoice',
  description:
    'Retrieve one Business Central purchase invoice by GUID with optional lines, vendor, dimensions, and attachment navigation expansion.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      purchaseInvoiceId: z.string().describe('Business Central purchase invoice GUID.'),
      select: z.array(z.string()).optional().describe('Optional OData $select fields.'),
      expand: z.array(z.string()).optional().describe('Optional OData $expand fields.'),
      expandLines: z
        .boolean()
        .optional()
        .describe('Expand purchaseInvoiceLines navigation data.'),
      expandVendor: z.boolean().optional().describe('Expand vendor navigation data.'),
      expandDimensions: z.boolean().optional().describe('Expand dimensionSetLines.'),
      expandAttachments: z
        .boolean()
        .optional()
        .describe('Expand attachments and documentAttachments metadata.')
    })
  )
  .output(purchaseInvoiceSchema)
  .handleInvocation(async rawCtx => {
    let ctx = rawCtx as InvoiceContext;
    let client = createClient(ctx);
    let companyId = resolveCompanyId(ctx);
    let purchaseInvoiceId = ctx.input.purchaseInvoiceId!;
    let params = compactRecord({
      $select: ctx.input.select?.join(','),
      $expand: purchaseExpand(ctx.input).join(',') || undefined
    });
    let record = await client.getData<Record<string, unknown>>(
      'get purchase invoice',
      `/${companyPath(companyId)}/${businessCentralEntityPath(
        'purchaseInvoices',
        purchaseInvoiceId
      )}`,
      params
    );
    let invoice = mapPurchaseInvoice(record);

    return {
      output: invoice,
      message: `Retrieved Business Central purchase invoice **${invoice.number ?? purchaseInvoiceId}**.`
    };
  })
  .build();
