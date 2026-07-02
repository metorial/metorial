import { SlateTool } from 'slates';
import { z } from 'zod';
import { finagoServiceError } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import {
  getNumber,
  getString,
  isRecord,
  mergeAdditionalFields,
  objectWithDefined
} from '../lib/records';
import { spec } from '../spec';
import { additionalFieldsSchema, maxPagesSchema } from './shared';

let maxInt32 = 2_147_483_647;

let invoiceDistributionMethodSchema = z.enum([
  '',
  'manualdistribution',
  'efakturadistribution',
  'ehfdistribution',
  'postaldistribution',
  'printdistribution',
  'emaildistribution'
]);

let invoicePaymentTermsTypeSchema = z.enum(['NumberOfDays', 'OutMonthPlusDays', 'FixedDate']);

let salesOrderDimensionSchema = z.object({
  dimensionType: z.number().int().describe('Finago dimension type ID.'),
  value: z.string().describe('Dimension element value/key.'),
  name: z.string().describe('Dimension element display name.')
});

let salesOrderDimensionsSchema = z
  .array(salesOrderDimensionSchema)
  .optional()
  .describe('Finago sales order dimensions such as project or department.');

let accrualSchema = z
  .object({
    startDate: z.string().optional().describe('Accrual start date.'),
    length: z.number().int().min(1).optional().describe('Accrual length in months.')
  })
  .optional()
  .describe(
    'Accrual object. Provide both startDate and length, or an empty object to reset accrual data.'
  );

let deliveryCustomerSchema = z
  .object({
    id: z.number().int().positive().optional().describe('Delivery customer ID.'),
    name: z.string().max(250).optional().describe('Delivery customer display name.'),
    street: z.string().max(250).optional().describe('Delivery street address.'),
    postalCode: z.string().max(16).optional().describe('Delivery postal code.'),
    postalArea: z.string().max(200).optional().describe('Delivery postal area.'),
    city: z.string().max(50).optional().describe('Delivery city.'),
    countrySubdivision: z
      .string()
      .max(100)
      .optional()
      .describe('Delivery country subdivision.'),
    countryCode: z.string().length(2).optional().describe('Delivery country code.')
  })
  .optional()
  .describe('Delivery details for the sales order.');

let salesOrderSchema = z.object({
  salesOrderId: z.number().optional().describe('Finago sales order ID.'),
  status: z.string().optional().describe('Sales order status.'),
  customerId: z.number().optional().describe('Customer ID.'),
  customerName: z.string().optional().describe('Customer name.'),
  date: z.string().optional().describe('Sales order date.'),
  invoiceNumber: z.number().optional().describe('Invoice number when invoiced.'),
  grossAmount: z.number().optional().describe('Gross order amount.'),
  netAmount: z.number().optional().describe('Net order amount.'),
  taxAmount: z.number().optional().describe('Tax amount.'),
  createdAt: z.string().optional().describe('Created timestamp.'),
  modifiedAt: z.string().optional().describe('Modified timestamp.'),
  lines: z.array(z.unknown()).optional().describe('Sales order lines, when requested.'),
  attachments: z
    .array(z.unknown())
    .optional()
    .describe('Sales order attachment metadata, when requested.'),
  record: z.unknown().describe('Raw Finago sales order record.')
});

let lineSchema = z.object({
  type: z
    .enum(['product', 'text'])
    .optional()
    .describe('Line type. Defaults to product when productId is supplied, otherwise text.'),
  productId: z.number().int().positive().optional().describe('Product ID for product lines.'),
  productNumber: z
    .string()
    .optional()
    .describe(
      'Deprecated for writes: Finago documents product.number as read-only and ignores it on line POST/PATCH. Provide productId instead.'
    ),
  description: z.string().min(1).max(300).optional().describe('Line description.'),
  quantity: z.number().optional().describe('Quantity.'),
  price: z.number().optional().describe('Unit price.'),
  costPrice: z.number().nullable().optional().describe('Cost price.'),
  discountRate: z.number().min(0).max(100).optional().describe('Discount percentage.'),
  taxId: z.number().int().positive().optional().describe('Tax ID.'),
  taxNumber: z.number().int().min(0).optional().describe('Tax code number.'),
  taxRate: z.number().min(0).max(100).optional().describe('Tax rate percentage.'),
  accountId: z.number().int().positive().optional().describe('Revenue account ID.'),
  accountNumber: z.number().int().positive().optional().describe('Revenue account number.'),
  accountName: z.string().max(75).optional().describe('Revenue account name.'),
  isHidden: z
    .boolean()
    .optional()
    .describe('Deprecated Finago old-invoicing flag; ignored by the new invoicing module.'),
  dimensions: salesOrderDimensionsSchema,
  accrual: accrualSchema
});

let nestedRecord = (record: unknown, key: string) =>
  isRecord(record) && isRecord(record[key]) ? record[key] : undefined;

let nestedNumber = (record: unknown, parent: string, key: string) => {
  let child = nestedRecord(record, parent);
  return isRecord(child) && typeof child[key] === 'number' ? child[key] : undefined;
};

let nestedString = (record: unknown, parent: string, key: string) => {
  let child = nestedRecord(record, parent);
  return isRecord(child) && typeof child[key] === 'string' ? child[key] : undefined;
};

let mapSalesOrder = (
  record: unknown,
  lines?: unknown[],
  attachments?: unknown[]
): z.infer<typeof salesOrderSchema> => ({
  salesOrderId: getNumber(record, 'id'),
  status: getString(record, 'status'),
  customerId: nestedNumber(record, 'customer', 'id'),
  customerName: nestedString(record, 'customer', 'name'),
  date: getString(record, 'date'),
  invoiceNumber: nestedNumber(record, 'invoice', 'number'),
  grossAmount: getNumber(record, 'grossAmount'),
  netAmount: getNumber(record, 'netAmount'),
  taxAmount: getNumber(record, 'taxAmount'),
  createdAt: getString(record, 'createdAt'),
  modifiedAt: getString(record, 'modifiedAt'),
  lines,
  attachments,
  record
});

let invoiceSalesOrderSchema = salesOrderSchema.extend({
  invoiceDate: z.string().optional().describe('Invoice issue date returned by Finago.'),
  invoiceDueDate: z.string().optional().describe('Invoice due date returned by Finago.'),
  invoiceDistributionMethod: z
    .string()
    .optional()
    .describe('Invoice distribution method returned by Finago.'),
  invoiceRemittanceReference: z
    .string()
    .optional()
    .describe('Invoice remittance reference returned by Finago.'),
  invoicePaymentTerms: z
    .unknown()
    .optional()
    .describe('Invoice payment terms returned by Finago.'),
  invoiceTransactionId: z
    .string()
    .optional()
    .describe('Transaction ID associated with the invoice, when returned by Finago.')
});

let mapInvoiceSalesOrder = (record: unknown): z.infer<typeof invoiceSalesOrderSchema> => {
  let invoice = nestedRecord(record, 'invoice');

  return {
    ...mapSalesOrder(record),
    invoiceDate: nestedString(record, 'invoice', 'date'),
    invoiceDueDate: nestedString(record, 'invoice', 'dueDate'),
    invoiceDistributionMethod: nestedString(record, 'invoice', 'distributionMethod'),
    invoiceRemittanceReference: nestedString(record, 'invoice', 'remittanceReference'),
    invoicePaymentTerms: invoice?.paymentTerms,
    invoiceTransactionId: nestedString(invoice, 'transaction', 'id')
  };
};

let requireSalesOrderPathId = (record: unknown) => {
  let id = getNumber(record, 'id');
  if (id === undefined || !Number.isInteger(id) || id <= 0 || id > maxInt32) {
    throw finagoServiceError(
      'Finago did not return a valid sales order ID required to fetch sales order lines or attachments.'
    );
  }

  return id;
};

let getSalesOrderOutputSchema = salesOrderSchema.extend({
  lineCount: z
    .number()
    .optional()
    .describe('Number of sales order line records fetched when includeLines is true.'),
  attachmentCount: z
    .number()
    .optional()
    .describe(
      'Number of sales order attachment metadata records fetched when includeAttachments is true.'
    )
});

let requireInt32PathId = (value: number, label: string) => {
  if (!Number.isInteger(value) || value <= 0 || value > maxInt32) {
    throw finagoServiceError(`${label} must be a positive 32-bit integer.`);
  }

  return value;
};

let normalizeAccrual = (
  accrual: { startDate?: string; length?: number } | undefined,
  label: string
) => {
  if (accrual === undefined) return undefined;

  let hasStartDate = accrual.startDate !== undefined;
  let hasLength = accrual.length !== undefined;
  if (hasStartDate !== hasLength) {
    throw finagoServiceError(
      `${label}.startDate and ${label}.length must be supplied together, or provide an empty object to reset accrual data.`
    );
  }

  return objectWithDefined({
    startDate: accrual.startDate,
    length: accrual.length
  });
};

let rejectAdditionalFieldConflicts = (
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

let createSalesOrderAdditionalFieldConflicts = [
  'customer',
  'currency',
  'status',
  'deliveryCustomer',
  'deliveryDate',
  'invoice',
  'accrual',
  'date',
  'internalMemo',
  'memo',
  'yourReference',
  'ourReference',
  'paymentMethod',
  'referenceNumber',
  'salesType',
  'dimensions',
  'lines'
];

let salesOrderBody = (input: {
  customerId?: number;
  customerName?: string;
  customerOrganizationNumber?: string;
  customerInvoiceEmailAddresses?: string[];
  customerGln?: string;
  customerStreet?: string;
  customerPostalCode?: string;
  customerPostalArea?: string;
  customerCity?: string;
  customerCountrySubdivision?: string;
  customerCountryCode?: string;
  status?: string;
  date?: string;
  deliveryDate?: string;
  deliveryCustomer?: z.infer<typeof deliveryCustomerSchema>;
  currencyCode?: string;
  currencyRate?: number;
  memo?: string;
  internalMemo?: string;
  referenceNumber?: string;
  paymentMethodId?: number | null;
  salesTypeId?: number;
  invoiceDate?: string;
  invoiceDueDate?: string;
  invoiceDistributionMethod?: string;
  invoiceRemittanceReference?: string;
  invoicePaymentTermsType?: z.infer<typeof invoicePaymentTermsTypeSchema>;
  invoicePaymentTermsDays?: number;
  invoicePaymentTermsFixedDate?: string;
  accrual?: z.infer<typeof accrualSchema>;
  yourReferenceId?: number;
  yourReferenceName?: string;
  ourReferenceId?: number;
  dimensions?: z.infer<typeof salesOrderDimensionsSchema>;
  additionalFields?: Record<string, unknown>;
}) => {
  let body: Record<string, unknown> = objectWithDefined({
    status: input.status,
    date: input.date,
    deliveryDate: input.deliveryDate,
    memo: input.memo,
    internalMemo: input.internalMemo,
    referenceNumber: input.referenceNumber,
    dimensions: input.dimensions,
    accrual: normalizeAccrual(input.accrual, 'accrual')
  });

  if (input.customerId !== undefined || input.customerName !== undefined) {
    body.customer = objectWithDefined({
      id: input.customerId,
      name: input.customerName,
      organizationNumber: input.customerOrganizationNumber,
      invoiceEmailAddresses: input.customerInvoiceEmailAddresses,
      gln: input.customerGln,
      street: input.customerStreet,
      postalCode: input.customerPostalCode,
      postalArea: input.customerPostalArea,
      city: input.customerCity,
      countrySubdivision: input.customerCountrySubdivision,
      countryCode: input.customerCountryCode
    });
  }

  if (input.currencyCode !== undefined || input.currencyRate !== undefined) {
    body.currency = objectWithDefined({
      code: input.currencyCode,
      rate: input.currencyRate
    });
  }

  if (input.deliveryCustomer !== undefined) {
    body.deliveryCustomer = objectWithDefined(input.deliveryCustomer);
  }

  if (input.paymentMethodId !== undefined) {
    body.paymentMethod = { id: input.paymentMethodId };
  }

  if (input.salesTypeId !== undefined) {
    body.salesType = { id: input.salesTypeId };
  }

  let paymentTerms = invoicePaymentTermsBody(input);
  if (
    input.invoiceDate !== undefined ||
    input.invoiceDueDate !== undefined ||
    input.invoiceDistributionMethod !== undefined ||
    input.invoiceRemittanceReference !== undefined ||
    paymentTerms !== undefined
  ) {
    body.invoice = objectWithDefined({
      date: input.invoiceDate,
      dueDate: input.invoiceDueDate,
      distributionMethod: input.invoiceDistributionMethod,
      remittanceReference: input.invoiceRemittanceReference,
      paymentTerms
    });
  }

  if (input.yourReferenceId !== undefined || input.yourReferenceName !== undefined) {
    body.yourReference = objectWithDefined({
      id: input.yourReferenceId,
      name: input.yourReferenceName
    });
  }

  if (input.ourReferenceId !== undefined) {
    body.ourReference = { id: input.ourReferenceId };
  }

  return mergeAdditionalFields(body, input.additionalFields);
};

let invoicePaymentTermsBody = (input: {
  invoicePaymentTermsType?: z.infer<typeof invoicePaymentTermsTypeSchema>;
  invoicePaymentTermsDays?: number;
  invoicePaymentTermsFixedDate?: string;
}) => {
  let hasDays = input.invoicePaymentTermsDays !== undefined;
  let hasFixedDate = input.invoicePaymentTermsFixedDate !== undefined;

  if (input.invoicePaymentTermsType === undefined) {
    if (hasDays || hasFixedDate) {
      throw finagoServiceError(
        'invoicePaymentTermsType is required when invoice payment term values are supplied.'
      );
    }

    return undefined;
  }

  if (input.invoicePaymentTermsType === 'FixedDate') {
    if (!hasFixedDate) {
      throw finagoServiceError(
        'invoicePaymentTermsFixedDate is required when invoicePaymentTermsType is FixedDate.'
      );
    }
    if (hasDays) {
      throw finagoServiceError(
        'invoicePaymentTermsDays cannot be supplied when invoicePaymentTermsType is FixedDate.'
      );
    }

    return { type: input.invoicePaymentTermsType, value: input.invoicePaymentTermsFixedDate };
  }

  if (!hasDays) {
    throw finagoServiceError(
      'invoicePaymentTermsDays is required when invoicePaymentTermsType is NumberOfDays or OutMonthPlusDays.'
    );
  }
  if (hasFixedDate) {
    throw finagoServiceError(
      'invoicePaymentTermsFixedDate cannot be supplied unless invoicePaymentTermsType is FixedDate.'
    );
  }

  return { type: input.invoicePaymentTermsType, value: input.invoicePaymentTermsDays };
};

let salesOrderLineBody = (line: z.infer<typeof lineSchema>) => {
  let type = line.type ?? (line.productId !== undefined ? 'product' : 'text');
  if (line.productNumber !== undefined && line.productId === undefined) {
    throw finagoServiceError(
      'productId is required for product sales order lines because Finago documents product.number as read-only and ignores it on line writes.'
    );
  }
  if (type === 'product' && line.productId === undefined) {
    throw finagoServiceError('productId is required for product sales order lines.');
  }
  if (type === 'text' && !line.description) {
    throw finagoServiceError('description is required for text sales order lines.');
  }

  let body: Record<string, unknown> = objectWithDefined({
    type,
    description: line.description,
    quantity: line.quantity,
    price: line.price,
    costPrice: line.costPrice,
    discountRate: line.discountRate,
    isHidden: line.isHidden,
    dimensions: line.dimensions,
    accrual: normalizeAccrual(line.accrual, 'line.accrual')
  });

  if (line.productId !== undefined) {
    body.product = objectWithDefined({
      id: line.productId
    });
  }

  if (line.taxId !== undefined || line.taxNumber !== undefined || line.taxRate !== undefined) {
    body.tax = objectWithDefined({
      id: line.taxId,
      number: line.taxNumber,
      rate: line.taxRate
    });
  }

  if (
    line.accountId !== undefined ||
    line.accountNumber !== undefined ||
    line.accountName !== undefined
  ) {
    body.account = objectWithDefined({
      id: line.accountId,
      number: line.accountNumber,
      name: line.accountName
    });
  }

  return body;
};

export let finagoListSalesOrders = SlateTool.create(spec, {
  name: 'List Sales Orders',
  key: 'finago_list_sales_orders',
  description:
    'List Finago sales orders with date, status, customer, invoice, created, and modified filters. Can optionally include lines and attachment metadata for returned orders.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      limit: z.number().int().positive().optional().describe('Page size.'),
      continuationToken: z
        .string()
        .optional()
        .describe('Continuation token from a Link header.'),
      date: z.string().optional().describe('Exact sales order date.'),
      dateFrom: z.string().optional().describe('Start sales order date.'),
      dateTo: z.string().optional().describe('End sales order date.'),
      status: z
        .enum(['Draft', 'Web', 'Proposal', 'Confirmed', 'Invoice', 'AdvanceInvoice'])
        .optional()
        .describe('Sales order status filter.'),
      customerId: z.string().optional().describe('Customer ID filter.'),
      invoiceNumber: z.string().optional().describe('Invoice number filter.'),
      createdFrom: z.string().optional().describe('Created timestamp lower bound.'),
      createdTo: z.string().optional().describe('Created timestamp upper bound.'),
      modifiedFrom: z.string().optional().describe('Modified timestamp lower bound.'),
      modifiedTo: z.string().optional().describe('Modified timestamp upper bound.'),
      includeLines: z.boolean().optional().describe('Fetch lines for each returned order.'),
      includeAttachments: z
        .boolean()
        .optional()
        .describe('Fetch attachment metadata for each returned order.'),
      maxPages: maxPagesSchema
    })
  )
  .output(
    z.object({
      salesOrders: z.array(salesOrderSchema),
      count: z.number(),
      pageCount: z.number().optional(),
      hasNextPage: z.boolean().optional(),
      nextLink: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let result = await client.list(
      '/salesorders',
      {
        limit: ctx.input.limit,
        continuationToken: ctx.input.continuationToken,
        date: ctx.input.date,
        dateFrom: ctx.input.dateFrom,
        dateTo: ctx.input.dateTo,
        status: ctx.input.status,
        customerId: ctx.input.customerId,
        invoiceNumber: ctx.input.invoiceNumber,
        createdFrom: ctx.input.createdFrom,
        createdTo: ctx.input.createdTo,
        modifiedFrom: ctx.input.modifiedFrom,
        modifiedTo: ctx.input.modifiedTo
      },
      ctx.input.maxPages ?? 1,
      'list sales orders'
    );

    let salesOrders = await Promise.all(
      result.records.map(async record => {
        let includeRelated = ctx.input.includeLines || ctx.input.includeAttachments;
        let id = includeRelated ? requireSalesOrderPathId(record) : getNumber(record, 'id');
        let lines =
          ctx.input.includeLines && id !== undefined
            ? (
                await client.list(
                  `/salesorders/${id}/lines`,
                  undefined,
                  1,
                  'list sales order lines'
                )
              ).records
            : undefined;
        let attachments =
          ctx.input.includeAttachments && id !== undefined
            ? (
                await client.list(
                  `/salesorders/${id}/attachments`,
                  undefined,
                  1,
                  'list sales order attachments'
                )
              ).records
            : undefined;
        return mapSalesOrder(record, lines, attachments);
      })
    );

    return {
      output: {
        salesOrders,
        count: salesOrders.length,
        pageCount: result.pageCount,
        hasNextPage: result.hasNextPage,
        nextLink: result.nextLink
      },
      message: `Retrieved **${salesOrders.length}** Finago sales order(s).`
    };
  })
  .build();

export let finagoGetSalesOrder = SlateTool.create(spec, {
  name: 'Get Sales Order',
  key: 'finago_get_sales_order',
  description:
    'Read one Finago sales order by ID with optional line items and attachment metadata.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      salesOrderId: z.number().int().positive().describe('Finago sales order ID.'),
      includeLines: z.boolean().optional().describe('Also fetch sales order lines.'),
      includeAttachments: z.boolean().optional().describe('Also fetch attachment metadata.')
    })
  )
  .output(getSalesOrderOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let salesOrderId = requireInt32PathId(ctx.input.salesOrderId, 'salesOrderId');
    let record = await client.get(
      `/salesorders/${salesOrderId}`,
      undefined,
      'read sales order'
    );
    let lines = ctx.input.includeLines
      ? (
          await client.list(
            `/salesorders/${salesOrderId}/lines`,
            undefined,
            1,
            'list sales order lines'
          )
        ).records
      : undefined;
    let attachments = ctx.input.includeAttachments
      ? (
          await client.list(
            `/salesorders/${salesOrderId}/attachments`,
            undefined,
            1,
            'list sales order attachments'
          )
        ).records
      : undefined;
    let output = {
      ...mapSalesOrder(record, lines, attachments),
      lineCount: lines?.length,
      attachmentCount: attachments?.length
    };

    return {
      output,
      message: `Retrieved Finago sales order **${salesOrderId}**.`
    };
  })
  .build();

export let finagoCreateSalesOrder = SlateTool.create(spec, {
  name: 'Create Sales Order',
  key: 'finago_create_sales_order',
  description:
    'Create a Finago sales order and optionally add line items. The order is created before lines are added, so a later line failure can leave a draft order without all intended lines.',
  constraints: [
    'customerId and customerName are required because Finago snapshots customer details onto sales orders.',
    'Line creation happens after order creation.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      customerId: z.number().int().positive().describe('Customer ID.'),
      customerName: z.string().describe('Customer name to snapshot onto the order.'),
      customerOrganizationNumber: z
        .string()
        .max(20)
        .optional()
        .describe('Customer organization number.'),
      customerInvoiceEmailAddresses: z
        .array(z.string().email())
        .optional()
        .describe('Invoice recipient email addresses.'),
      customerGln: z.string().length(13).optional().describe('Customer GLN.'),
      customerStreet: z.string().max(250).optional().describe('Customer street address.'),
      customerPostalCode: z.string().max(50).optional().describe('Customer postal code.'),
      customerPostalArea: z.string().max(50).optional().describe('Customer postal area.'),
      customerCity: z.string().max(50).optional().describe('Customer city.'),
      customerCountrySubdivision: z
        .string()
        .max(50)
        .optional()
        .describe('Customer country subdivision.'),
      customerCountryCode: z.string().length(2).optional().describe('Customer country code.'),
      status: z
        .enum(['Draft', 'Web', 'Proposal', 'Confirmed'])
        .optional()
        .describe('Initial non-invoice sales order status. Defaults to Finago behavior.'),
      date: z.string().optional().describe('Sales order date.'),
      deliveryDate: z.string().optional().describe('Delivery date.'),
      deliveryCustomer: deliveryCustomerSchema,
      currencyCode: z
        .string()
        .length(3)
        .regex(/^[A-Z]{3}$/)
        .optional()
        .describe('Uppercase ISO 4217 currency code.'),
      currencyRate: z
        .number()
        .min(1e-10)
        .max(1_000_000_000)
        .optional()
        .describe('Currency exchange rate.'),
      memo: z.string().optional().describe('Customer-visible memo.'),
      internalMemo: z.string().max(300).optional().describe('Internal memo.'),
      referenceNumber: z
        .string()
        .max(50)
        .optional()
        .describe('Customer reference or PO number.'),
      paymentMethodId: z
        .number()
        .int()
        .positive()
        .nullable()
        .optional()
        .describe('Payment method ID from reference data.'),
      salesTypeId: z.number().int().optional().describe('Sales type ID.'),
      invoiceDate: z.string().optional().describe('Invoice date if invoice info is supplied.'),
      invoiceDueDate: z.string().optional().describe('Invoice due date.'),
      invoiceDistributionMethod: invoiceDistributionMethodSchema
        .optional()
        .describe(
          'Documented invoice distribution method. Use empty string for Finago automatic selection.'
        ),
      invoiceRemittanceReference: z
        .string()
        .optional()
        .describe('Invoice remittance reference.'),
      invoicePaymentTermsType: invoicePaymentTermsTypeSchema
        .optional()
        .describe('Invoice payment terms type.'),
      invoicePaymentTermsDays: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Payment term day count for NumberOfDays or OutMonthPlusDays.'),
      invoicePaymentTermsFixedDate: z
        .string()
        .optional()
        .describe('Fixed payment due date when invoicePaymentTermsType is FixedDate.'),
      accrual: accrualSchema,
      yourReferenceId: z.number().optional().describe('Customer-side reference person ID.'),
      yourReferenceName: z
        .string()
        .optional()
        .describe('Customer-side reference person name.'),
      ourReferenceId: z
        .number()
        .optional()
        .describe('Organization-side reference person ID from /organization/people.'),
      dimensions: salesOrderDimensionsSchema,
      lines: z
        .array(lineSchema)
        .optional()
        .describe('Sales order lines to add after creation.'),
      additionalFields: additionalFieldsSchema
    })
  )
  .output(
    salesOrderSchema.extend({
      lineCount: z.number().describe('Number of lines added by this call.')
    })
  )
  .handleInvocation(async ctx => {
    rejectAdditionalFieldConflicts(
      ctx.input.additionalFields,
      createSalesOrderAdditionalFieldConflicts,
      'creating a sales order'
    );
    let orderBody = salesOrderBody(ctx.input);
    let lineBodies = (ctx.input.lines ?? []).map(salesOrderLineBody);
    let client = createClientFromContext(ctx);
    let order = await client.post('/salesorders', orderBody, undefined, 'create sales order');
    let salesOrderId = getNumber(order, 'id');
    if (salesOrderId === undefined) {
      throw finagoServiceError('Finago did not return a sales order ID.');
    }
    salesOrderId = requireInt32PathId(salesOrderId, 'Finago sales order ID');

    let lines: unknown[] = [];
    for (let lineBody of lineBodies) {
      lines.push(
        await client.post(
          `/salesorders/${salesOrderId}/lines`,
          lineBody,
          undefined,
          'create sales order line'
        )
      );
    }

    let output = {
      ...mapSalesOrder(order, lines.length > 0 ? lines : undefined),
      lineCount: lines.length
    };

    return {
      output,
      message: `Created Finago sales order **${salesOrderId}** with **${lines.length}** line(s).`
    };
  })
  .build();

export let finagoInvoiceSalesOrder = SlateTool.create(spec, {
  name: 'Invoice Sales Order',
  key: 'finago_invoice_sales_order',
  description:
    'Convert an existing Finago sales order to invoice status by patching its status to Invoice. The sales order must already contain at least one line.',
  constraints: [
    'This is customer-facing and can trigger Finago invoice handling.',
    'confirm must be true.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      salesOrderId: z.number().int().positive().describe('Finago sales order ID.'),
      confirm: z
        .boolean()
        .describe('Must be true to confirm changing the sales order status to Invoice.'),
      invoiceDate: z.string().optional().describe('Optional invoice date.'),
      invoiceDueDate: z.string().optional().describe('Optional invoice due date.'),
      invoiceDistributionMethod: invoiceDistributionMethodSchema
        .optional()
        .describe(
          'Optional documented invoice distribution method. Use empty string for Finago automatic selection.'
        ),
      invoiceRemittanceReference: z
        .string()
        .optional()
        .describe('Optional remittance reference.'),
      invoicePaymentTermsType: invoicePaymentTermsTypeSchema
        .optional()
        .describe('Optional invoice payment terms type.'),
      invoicePaymentTermsDays: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Payment term day count for NumberOfDays or OutMonthPlusDays.'),
      invoicePaymentTermsFixedDate: z
        .string()
        .optional()
        .describe('Fixed payment due date when invoicePaymentTermsType is FixedDate.'),
      additionalFields: additionalFieldsSchema
    })
  )
  .output(invoiceSalesOrderSchema)
  .handleInvocation(async ctx => {
    let salesOrderId = requireInt32PathId(ctx.input.salesOrderId, 'salesOrderId');
    if (ctx.input.confirm !== true) {
      throw finagoServiceError('confirm must be true to invoice a sales order.');
    }

    let client = createClientFromContext(ctx);
    let record = await client.patch(
      `/salesorders/${salesOrderId}`,
      salesOrderBody({
        status: 'Invoice',
        invoiceDate: ctx.input.invoiceDate,
        invoiceDueDate: ctx.input.invoiceDueDate,
        invoiceDistributionMethod: ctx.input.invoiceDistributionMethod,
        invoiceRemittanceReference: ctx.input.invoiceRemittanceReference,
        invoicePaymentTermsType: ctx.input.invoicePaymentTermsType,
        invoicePaymentTermsDays: ctx.input.invoicePaymentTermsDays,
        invoicePaymentTermsFixedDate: ctx.input.invoicePaymentTermsFixedDate,
        additionalFields: ctx.input.additionalFields
      }),
      undefined,
      'invoice sales order'
    );
    let output = mapInvoiceSalesOrder(record);

    return {
      output,
      message: `Changed Finago sales order **${salesOrderId}** to invoice status.`
    };
  })
  .build();
