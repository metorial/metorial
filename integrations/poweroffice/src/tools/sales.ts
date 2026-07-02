import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { buildPatch, compact } from '../lib/client';
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
  requireAtLeastOne,
  stringValue
} from './shared';

let salesOrderLineSchema = z.object({
  id: z.string().optional().describe('PowerOffice sales order line id.'),
  salesOrderId: z.string().optional().describe('PowerOffice sales order id.'),
  lineType: z.string().optional().describe('Line type.'),
  sortOrder: z.number().optional().describe('Sort order.'),
  description: z.string().optional().describe('Line description.'),
  productId: z.number().optional().describe('Product id.'),
  productCode: z.string().optional().describe('Product code.'),
  quantity: z.number().optional().describe('Quantity.'),
  productUnitPrice: z.number().optional().describe('Unit sales price.'),
  productUnitCost: z.number().optional().describe('Unit cost.'),
  allowance: z.number().optional().describe('Discount or allowance percent.'),
  netAmount: z.number().optional().describe('Net amount.'),
  totalAmount: z.number().optional().describe('Total amount.'),
  vatAmount: z.number().optional().describe('VAT amount.'),
  vatCode: z.string().optional().describe('VAT code.'),
  vatRate: z.number().optional().describe('VAT rate.'),
  unitOfMeasureCode: z.string().optional().describe('Unit of measure code.'),
  useStandardSalesAccount: z.boolean().optional().describe('Use product standard account.'),
  dimensions: accountingDimensionOutputSchema.optional(),
  record: rawRecordSchema
});

let salesOrderSchema = z.object({
  id: z.string().optional().describe('PowerOffice sales order id.'),
  salesOrderNo: z.number().optional().describe('Sales order number.'),
  importedOrderNo: z.number().optional().describe('Imported order number.'),
  externalImportReference: z.string().optional().describe('External import reference.'),
  customerId: z.number().optional().describe('Customer id.'),
  customerNo: z.number().optional().describe('Customer number.'),
  salesOrderStatus: z.string().optional().describe('Order status.'),
  salesOrderDate: z.string().optional().describe('Sales order date.'),
  deliveryDate: z.string().optional().describe('Delivery date.'),
  currencyCode: z.string().optional().describe('Currency code.'),
  netAmount: z.number().optional().describe('Net amount.'),
  totalAmount: z.number().optional().describe('Total amount.'),
  lineCount: z.number().optional().describe('Number of lines.'),
  purchaseOrderReference: z.string().optional().describe('Purchase order reference.'),
  customerReference: z.string().optional().describe('Customer reference.'),
  isCreatedByCurrentIntegration: z
    .boolean()
    .optional()
    .describe('Whether this sales order was created by the current integration.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  dimensions: accountingDimensionOutputSchema.optional(),
  record: rawRecordSchema
});

let salesOrderLineInputSchema = z.object({
  productId: z.number().int().optional().describe('PowerOffice product id.'),
  productCode: z.string().optional().describe('PowerOffice product code.'),
  description: z.string().optional().describe('Line description.'),
  quantity: z.number().optional().describe('Line quantity.'),
  productUnitPrice: z.number().optional().describe('Unit sales price.'),
  productUnitCost: z.number().optional().describe('Unit cost.'),
  allowance: z.number().optional().describe('Discount or allowance percent.'),
  unitOfMeasureCode: z.string().optional().describe('Unit of measure code.'),
  lineType: z.string().optional().describe('PowerOffice sales order line type.'),
  projectCode: z.string().optional().describe('Project code for this line.'),
  projectId: z.number().int().optional().describe('Project id for this line.'),
  departmentCode: z.string().optional().describe('Department code for this line.'),
  departmentId: z.number().int().optional().describe('Department id for this line.'),
  locationCode: z.string().optional().describe('Location code for this line.'),
  locationId: z.number().int().optional().describe('Location id for this line.'),
  sortOrder: z.number().int().optional().describe('Line sort order.'),
  externalImportReference: z.string().optional().describe('External line reference.'),
  useStandardSalesAccount: z
    .boolean()
    .optional()
    .describe('Whether to use the product standard sales account.')
});

let sendInvoiceOutputSchema = z.object({
  dryRun: z.boolean().describe('Whether the send was simulated locally.'),
  salesOrderId: z.string().describe('PowerOffice sales order id.'),
  deliveryType: z.string().optional().describe('Requested invoice delivery type.'),
  emailAddress: z.string().optional().describe('Requested recipient email address.'),
  overrideDueDate: z.string().optional().describe('Requested invoice due date override.'),
  voucherDate: z.string().optional().describe('Requested voucher date.'),
  request: rawRecordSchema.optional().describe('PowerOffice send request response.')
});

let salesOrderSentStateSchema = z.object({
  id: z.string().optional().describe('Sales order id.'),
  salesOrderNo: z.number().optional().describe('Sales order number.'),
  sentState: z.string().optional().describe('PowerOffice sent state.'),
  record: rawRecordSchema
});

let salesOrderAttachmentSchema = z.object({
  id: z.number().optional().describe('Attachment id.'),
  salesOrderId: z.string().optional().describe('Sales order id.'),
  fileName: z.string().optional().describe('Attachment filename.'),
  fileSize: z.number().optional().describe('Attachment size in bytes.'),
  createdDateTimeOffset: z.string().optional().describe('Created timestamp.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  record: rawRecordSchema
});

let mapSalesOrder = (order: Record<string, unknown>) => ({
  ...compactOutput({
    id: stringValue(order, 'Id'),
    salesOrderNo: numberValue(order, 'SalesOrderNo'),
    importedOrderNo: numberValue(order, 'ImportedOrderNo'),
    externalImportReference: stringValue(order, 'ExternalImportReference'),
    customerId: numberValue(order, 'CustomerId'),
    customerNo: numberValue(order, 'CustomerNo'),
    salesOrderStatus: stringValue(order, 'SalesOrderStatus'),
    salesOrderDate: stringValue(order, 'SalesOrderDate'),
    deliveryDate: stringValue(order, 'DeliveryDate'),
    currencyCode: stringValue(order, 'CurrencyCode'),
    netAmount: numberValue(order, 'NetAmount'),
    totalAmount: numberValue(order, 'TotalAmount'),
    lineCount: numberValue(order, 'LineCount'),
    purchaseOrderReference: stringValue(order, 'PurchaseOrderReference'),
    customerReference: stringValue(order, 'CustomerReference'),
    isCreatedByCurrentIntegration:
      typeof order.IsCreatedByCurrentIntegration === 'boolean'
        ? (order.IsCreatedByCurrentIntegration as boolean)
        : undefined,
    lastChangedDateTimeOffset: stringValue(order, 'LastChangedDateTimeOffset'),
    dimensions: mapDimensions(order)
  }),
  record: order
});

let mapSalesOrderLine = (line: Record<string, unknown>) => ({
  ...compactOutput({
    id: stringValue(line, 'Id'),
    salesOrderId: stringValue(line, 'SalesOrderId'),
    lineType: stringValue(line, 'LineType'),
    sortOrder: numberValue(line, 'SortOrder'),
    description: stringValue(line, 'Description'),
    productId: numberValue(line, 'ProductId'),
    productCode: stringValue(line, 'ProductCode'),
    quantity: numberValue(line, 'Quantity'),
    productUnitPrice: numberValue(line, 'ProductUnitPrice'),
    productUnitCost: numberValue(line, 'ProductUnitCost'),
    allowance: numberValue(line, 'Allowance'),
    netAmount: numberValue(line, 'NetAmount'),
    totalAmount: numberValue(line, 'TotalAmount'),
    vatAmount: numberValue(line, 'VatAmount'),
    vatCode: stringValue(line, 'VatCode'),
    vatRate: numberValue(line, 'VatRate'),
    unitOfMeasureCode: stringValue(line, 'UnitOfMeasureCode'),
    useStandardSalesAccount:
      typeof line.UseStandardSalesAccount === 'boolean'
        ? (line.UseStandardSalesAccount as boolean)
        : undefined,
    dimensions: mapDimensions(line)
  }),
  record: line
});

let mapSalesOrderSentState = (sentState: Record<string, unknown>) => ({
  ...compactOutput({
    id: stringValue(sentState, 'Id') ?? stringValue(sentState, 'SalesOrderId'),
    salesOrderNo: numberValue(sentState, 'SalesOrderNo'),
    sentState: stringValue(sentState, 'SentState') ?? stringValue(sentState, 'State')
  }),
  record: sentState
});

let mapSalesOrderAttachment = (attachment: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(attachment, 'Id'),
    salesOrderId: stringValue(attachment, 'SalesOrderId'),
    fileName: stringValue(attachment, 'FileName'),
    fileSize: numberValue(attachment, 'FileSize'),
    createdDateTimeOffset: stringValue(attachment, 'CreatedDateTimeOffset'),
    lastChangedDateTimeOffset: stringValue(attachment, 'LastChangedDateTimeOffset')
  }),
  record: attachment
});

let buildSalesOrderLine = (line: z.infer<typeof salesOrderLineInputSchema>) =>
  compact({
    ProductId: line.productId,
    ProductCode: line.productCode,
    Description: line.description,
    Quantity: line.quantity,
    ProductUnitPrice: line.productUnitPrice,
    ProductUnitCost: line.productUnitCost,
    Allowance: line.allowance,
    UnitOfMeasureCode: line.unitOfMeasureCode,
    LineType: line.lineType,
    ProjectCode: line.projectCode,
    ProjectId: line.projectId,
    DepartmentCode: line.departmentCode,
    DepartmentId: line.departmentId,
    LocationCode: line.locationCode,
    LocationId: line.locationId,
    SortOrder: line.sortOrder,
    ExternalImportReference: line.externalImportReference,
    UseStandardSalesAccount: line.useStandardSalesAccount
  });

export let powerofficeListSalesOrders = SlateTool.create(spec, {
  name: 'List PowerOffice Sales Orders',
  key: 'poweroffice_list_sales_orders',
  description:
    'List PowerOffice sales order headers by customer, project, order status, external references, changed timestamp, and current-integration ownership.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customerNos: z.string().optional().describe('Customer numbers filter.'),
      departmentCodes: z.string().optional().describe('Department codes filter.'),
      externalImportReferences: z.string().optional().describe('External references filter.'),
      importedOrderNos: z.string().optional().describe('Imported order numbers filter.'),
      includeSubProject: z.boolean().optional().describe('Include subprojects.'),
      lastChangedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return sales orders changed after this timestamp.'),
      onlyCreatedByCurrentIntegration: z
        .boolean()
        .optional()
        .describe('Only return orders created by this integration.'),
      orderStatus: z.enum(['Draft', 'Confirmed']).optional().describe('Sales order status.'),
      projectCodes: z.string().optional().describe('Project codes filter.'),
      salesOrderNos: z.string().optional().describe('Sales order numbers filter.'),
      showInherited: z.boolean().optional().describe('Return inherited values as in the GUI.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      salesOrders: z.array(salesOrderSchema).describe('Sales orders returned by PowerOffice.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let salesOrders = await client.listSalesOrders(
      buildListParams(ctx.input, {
        customerNos: ctx.input.customerNos,
        departmentCodes: ctx.input.departmentCodes,
        externalImportReferences: ctx.input.externalImportReferences,
        importedOrderNos: ctx.input.importedOrderNos,
        includeSubProject: ctx.input.includeSubProject,
        lastChangedDateTimeOffsetGreaterThan: ctx.input.lastChangedDateTimeOffsetGreaterThan,
        onlyCreatedByCurrentIntegration: ctx.input.onlyCreatedByCurrentIntegration,
        orderStatus: ctx.input.orderStatus,
        projectCodes: ctx.input.projectCodes,
        salesOrderNos: ctx.input.salesOrderNos,
        showInherited: ctx.input.showInherited
      })
    );

    return {
      output: {
        salesOrders: salesOrders.map(mapSalesOrder),
        page: pageSummary(ctx.input, salesOrders.length)
      },
      message: `Retrieved **${salesOrders.length}** PowerOffice sales order(s).`
    };
  })
  .build();

export let powerofficeGetSalesOrder = SlateTool.create(spec, {
  name: 'Get PowerOffice Sales Order',
  key: 'poweroffice_get_sales_order',
  description:
    'Get a complete PowerOffice sales order by id, including line details, for draft review and invoice preparation.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      salesOrderId: z.string().min(1).describe('PowerOffice sales order id.'),
      showInherited: z.boolean().optional().describe('Return inherited values as in the GUI.')
    })
  )
  .output(
    z.object({
      salesOrder: salesOrderSchema,
      lines: z.array(salesOrderLineSchema).describe('Sales order lines.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let order = await client.getSalesOrder(ctx.input.salesOrderId, {
      showInherited: ctx.input.showInherited
    });
    let rawLines = Array.isArray(order.SalesOrderLines)
      ? (order.SalesOrderLines as Record<string, unknown>[])
      : [];

    return {
      output: {
        salesOrder: mapSalesOrder(order),
        lines: rawLines.map(mapSalesOrderLine)
      },
      message: `Retrieved PowerOffice sales order **${numberValue(order, 'SalesOrderNo') ?? ctx.input.salesOrderId}**.`
    };
  })
  .build();

export let powerofficeCreateSalesOrder = SlateTool.create(spec, {
  name: 'Create PowerOffice Sales Order',
  key: 'poweroffice_create_sales_order',
  description:
    'Create a complete PowerOffice sales order draft with header fields and lines for downstream invoicing.',
  constraints: [
    'This creates a sales order in PowerOffice. It does not send an invoice.',
    'Provide either customerId or customerNo so PowerOffice can resolve the customer.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.number().int().optional().describe('PowerOffice customer id.'),
      customerNo: z.number().int().optional().describe('PowerOffice customer number.'),
      salesOrderDate: z.string().optional().describe('Sales order date (YYYY-MM-DD).'),
      salesOrderStatus: z
        .enum(['Draft', 'Confirmed'])
        .optional()
        .describe('Sales order status.'),
      currencyCode: z.string().optional().describe('Currency code. Defaults in PowerOffice.'),
      importedOrderNo: z.number().int().optional().describe('Imported order number.'),
      externalImportReference: z.string().optional().describe('External import reference.'),
      customerReference: z.string().optional().describe('Customer/buyer reference.'),
      purchaseOrderReference: z.string().optional().describe('Purchase order reference.'),
      projectCode: z.string().optional().describe('Header project code.'),
      projectId: z.number().int().optional().describe('Header project id.'),
      departmentCode: z.string().optional().describe('Header department code.'),
      departmentId: z.number().int().optional().describe('Header department id.'),
      locationCode: z.string().optional().describe('Header location code.'),
      locationId: z.number().int().optional().describe('Header location id.'),
      paymentTerm: z.number().int().optional().describe('Payment term in days.'),
      paymentTermId: z.number().int().optional().describe('Payment term id.'),
      deliveryDate: z.string().optional().describe('Delivery date (YYYY-MM-DD).'),
      lines: z.array(salesOrderLineInputSchema).min(1).describe('Sales order lines to create.')
    })
  )
  .output(
    z.object({
      salesOrder: salesOrderSchema
    })
  )
  .handleInvocation(async ctx => {
    requireAtLeastOne(
      { customerId: ctx.input.customerId, customerNo: ctx.input.customerNo },
      'Provide customerId or customerNo to create a sales order.'
    );

    for (let [index, line] of ctx.input.lines.entries()) {
      if (!line.productId && !line.productCode && !line.description) {
        throw powerOfficeValidationError(
          `Line ${index + 1} requires productId, productCode, or description.`
        );
      }
    }

    let client = createClient(ctx);
    let order = await client.createSalesOrder(
      compact({
        CustomerId: ctx.input.customerId,
        CustomerNo: ctx.input.customerNo,
        SalesOrderDate: ctx.input.salesOrderDate,
        SalesOrderStatus: ctx.input.salesOrderStatus,
        CurrencyCode: ctx.input.currencyCode,
        ImportedOrderNo: ctx.input.importedOrderNo,
        ExternalImportReference: ctx.input.externalImportReference,
        CustomerReference: ctx.input.customerReference,
        PurchaseOrderReference: ctx.input.purchaseOrderReference,
        ProjectCode: ctx.input.projectCode,
        ProjectId: ctx.input.projectId,
        DepartmentCode: ctx.input.departmentCode,
        DepartmentId: ctx.input.departmentId,
        LocationCode: ctx.input.locationCode,
        LocationId: ctx.input.locationId,
        PaymentTerm: ctx.input.paymentTerm,
        PaymentTermId: ctx.input.paymentTermId,
        DeliveryDate: ctx.input.deliveryDate,
        SalesOrderLines: ctx.input.lines.map(buildSalesOrderLine)
      })
    );

    return {
      output: {
        salesOrder: mapSalesOrder(order)
      },
      message: `Created PowerOffice sales order **${numberValue(order, 'SalesOrderNo') ?? stringValue(order, 'Id') ?? 'draft'}**.`
    };
  })
  .build();

export let powerofficeGetSalesOrderLines = SlateTool.create(spec, {
  name: 'Get PowerOffice Sales Order Lines',
  key: 'poweroffice_get_sales_order_lines',
  description:
    'List line details for a specific PowerOffice sales order draft or confirmed order.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      salesOrderId: z.string().min(1).describe('PowerOffice sales order id.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      lines: z.array(salesOrderLineSchema).describe('Sales order lines.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let lines = await client.listSalesOrderLines(
      ctx.input.salesOrderId,
      buildListParams(ctx.input)
    );

    return {
      output: {
        lines: lines.map(mapSalesOrderLine),
        page: pageSummary(ctx.input, lines.length)
      },
      message: `Retrieved **${lines.length}** PowerOffice sales order line(s).`
    };
  })
  .build();

export let powerofficeManageSalesOrderLine = SlateTool.create(spec, {
  name: 'Manage PowerOffice Sales Order Line',
  key: 'poweroffice_manage_sales_order_line',
  description:
    'Create, update, or delete a line on an existing PowerOffice sales order draft.',
  constraints: [
    'This changes sales order draft line data in PowerOffice.',
    'For delete, provide lineId and action "delete".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Line operation.'),
      salesOrderId: z.string().min(1).describe('PowerOffice sales order id.'),
      lineId: z
        .string()
        .optional()
        .describe('PowerOffice sales order line id. Required for update and delete.'),
      productId: z.number().int().optional().describe('PowerOffice product id.'),
      productCode: z.string().optional().describe('PowerOffice product code.'),
      description: z.string().optional().describe('Line description.'),
      quantity: z.number().optional().describe('Line quantity.'),
      productUnitPrice: z.number().optional().describe('Unit sales price.'),
      productUnitCost: z.number().optional().describe('Unit cost.'),
      allowance: z.number().optional().describe('Discount or allowance percent.'),
      unitOfMeasureCode: z.string().optional().describe('Unit of measure code.'),
      lineType: z.string().optional().describe('PowerOffice sales order line type.'),
      projectCode: z.string().optional().describe('Project code for this line.'),
      projectId: z.number().int().optional().describe('Project id for this line.'),
      departmentCode: z.string().optional().describe('Department code for this line.'),
      departmentId: z.number().int().optional().describe('Department id for this line.'),
      locationCode: z.string().optional().describe('Location code for this line.'),
      locationId: z.number().int().optional().describe('Location id for this line.'),
      sortOrder: z.number().int().optional().describe('Line sort order.'),
      externalImportReference: z.string().optional().describe('External line reference.'),
      useStandardSalesAccount: z
        .boolean()
        .optional()
        .describe('Whether to use the product standard sales account.')
    })
  )
  .output(
    z.object({
      action: z.enum(['created', 'updated', 'deleted']),
      line: salesOrderLineSchema.optional().describe('Created or updated line.'),
      salesOrderId: z.string().describe('Sales order id.'),
      lineId: z.string().optional().describe('Deleted line id.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'delete') {
      if (!ctx.input.lineId) {
        throw powerOfficeValidationError('lineId is required when action is delete.');
      }

      await client.deleteSalesOrderLine(ctx.input.salesOrderId, ctx.input.lineId);
      return {
        output: {
          action: 'deleted',
          salesOrderId: ctx.input.salesOrderId,
          lineId: ctx.input.lineId
        },
        message: `Deleted PowerOffice sales order line **${ctx.input.lineId}**.`
      };
    }

    if (ctx.input.action === 'update' && !ctx.input.lineId) {
      throw powerOfficeValidationError('lineId is required when action is update.');
    }

    let lineBody = buildSalesOrderLine(ctx.input);
    if (ctx.input.action === 'create') {
      if (!ctx.input.productId && !ctx.input.productCode && !ctx.input.description) {
        throw powerOfficeValidationError(
          'Provide productId, productCode, or description when creating a sales order line.'
        );
      }

      let line = await client.createSalesOrderLine(ctx.input.salesOrderId, lineBody);
      return {
        output: {
          action: 'created',
          salesOrderId: ctx.input.salesOrderId,
          line: mapSalesOrderLine(line)
        },
        message: `Created PowerOffice sales order line **${stringValue(line, 'Id') ?? 'line'}**.`
      };
    }

    let line = await client.updateSalesOrderLine(
      ctx.input.salesOrderId,
      ctx.input.lineId!,
      buildPatch(lineBody)
    );
    return {
      output: {
        action: 'updated',
        salesOrderId: ctx.input.salesOrderId,
        line: mapSalesOrderLine(line)
      },
      message: `Updated PowerOffice sales order line **${ctx.input.lineId}**.`
    };
  })
  .build();

export let powerofficeSendSalesOrderInvoice = SlateTool.create(spec, {
  name: 'Send PowerOffice Sales Order Invoice',
  key: 'poweroffice_send_sales_order_invoice',
  description:
    'Create and queue an invoice delivery from an existing PowerOffice sales order, with an optional dry run for confirmation flows.',
  constraints: [
    'This can send or queue an invoice to an end customer unless dryRun is true.',
    'Use dryRun first when the caller has not explicitly confirmed invoice delivery.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      salesOrderId: z.string().min(1).describe('PowerOffice sales order id.'),
      dryRun: z
        .boolean()
        .optional()
        .describe(
          'When true, validate inputs and return the planned request without sending.'
        ),
      deliveryType: z
        .enum(['PdfByEmail', 'PdfPrintForDownload', 'Auto', 'EHF', 'Efaktura', 'AvtaleGiro'])
        .optional()
        .describe('PowerOffice invoice delivery type.'),
      emailAddress: z
        .string()
        .optional()
        .describe('Recipient email for PdfByEmail or Auto fallback.'),
      overrideDueDate: z.string().optional().describe('Override due date (YYYY-MM-DD).'),
      voucherDate: z.string().optional().describe('Invoice voucher date (YYYY-MM-DD).')
    })
  )
  .output(sendInvoiceOutputSchema)
  .handleInvocation(async ctx => {
    if (
      (ctx.input.deliveryType === 'PdfByEmail' || ctx.input.deliveryType === 'Auto') &&
      !ctx.input.emailAddress
    ) {
      throw powerOfficeValidationError(
        'emailAddress is required when deliveryType is PdfByEmail or Auto.'
      );
    }

    let request = compact({
      DeliveryType: ctx.input.deliveryType,
      EmailAddress: ctx.input.emailAddress,
      OverrideDueDate: ctx.input.overrideDueDate,
      VoucherDate: ctx.input.voucherDate
    });

    if (ctx.input.dryRun) {
      return {
        output: {
          dryRun: true,
          salesOrderId: ctx.input.salesOrderId,
          deliveryType: ctx.input.deliveryType,
          emailAddress: ctx.input.emailAddress,
          overrideDueDate: ctx.input.overrideDueDate,
          voucherDate: ctx.input.voucherDate,
          request
        },
        message: `Dry run only. PowerOffice sales order **${ctx.input.salesOrderId}** was not sent.`
      };
    }

    let client = createClient(ctx);
    let response = await client.sendSalesOrderInvoice(ctx.input.salesOrderId, request);

    return {
      output: {
        dryRun: false,
        salesOrderId: ctx.input.salesOrderId,
        deliveryType: ctx.input.deliveryType,
        emailAddress: ctx.input.emailAddress,
        overrideDueDate: ctx.input.overrideDueDate,
        voucherDate: ctx.input.voucherDate,
        request: response
      },
      message: `Queued invoice delivery for PowerOffice sales order **${ctx.input.salesOrderId}**.`
    };
  })
  .build();

export let powerofficeGetSalesOrderSentState = SlateTool.create(spec, {
  name: 'Get PowerOffice Sales Order Sent State',
  key: 'poweroffice_get_sales_order_sent_state',
  description:
    'Get PowerOffice sales order invoice delivery/sent state, optionally for one sales order id.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      salesOrderId: z.string().optional().describe('Optional PowerOffice sales order id.')
    })
  )
  .output(
    z.object({
      sentStates: z.array(salesOrderSentStateSchema).describe('Sales order sent states.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let sentStates = await client.listSalesOrderSentState({
      id: ctx.input.salesOrderId
    });

    return {
      output: {
        sentStates: sentStates.map(mapSalesOrderSentState)
      },
      message: `Retrieved **${sentStates.length}** PowerOffice sales order sent state record(s).`
    };
  })
  .build();

export let powerofficeListSalesOrderAttachments = SlateTool.create(spec, {
  name: 'List PowerOffice Sales Order Attachments',
  key: 'poweroffice_list_sales_order_attachments',
  description:
    'List attachment metadata for a PowerOffice sales order before downloading a specific file.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      salesOrderId: z.string().min(1).describe('PowerOffice sales order id.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      attachments: z.array(salesOrderAttachmentSchema).describe('Sales order attachments.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let attachments = await client.listSalesOrderAttachments(
      ctx.input.salesOrderId,
      buildListParams(ctx.input)
    );

    return {
      output: {
        attachments: attachments.map(mapSalesOrderAttachment),
        page: pageSummary(ctx.input, attachments.length)
      },
      message: `Retrieved **${attachments.length}** PowerOffice sales order attachment(s).`
    };
  })
  .build();

export let powerofficeDownloadSalesOrderAttachment = SlateTool.create(spec, {
  name: 'Download PowerOffice Sales Order Attachment',
  key: 'poweroffice_download_sales_order_attachment',
  description:
    'Download a PowerOffice sales order attachment as a Slate attachment for audit and order documentation workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      salesOrderId: z.string().min(1).describe('PowerOffice sales order id.'),
      attachmentId: z.number().int().describe('PowerOffice sales order attachment id.'),
      filename: z.string().optional().describe('Attachment filename override.')
    })
  )
  .output(
    z.object({
      salesOrderId: z.string().describe('Sales order id.'),
      attachmentId: z.number().describe('Attachment id.'),
      filename: z.string().describe('Attachment filename.'),
      mimeType: z.string().describe('Attachment MIME type.'),
      sizeBytes: z.number().describe('Attachment byte size.'),
      attachmentCount: z.number().describe('Number of attachments returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let download = await client.downloadSalesOrderAttachment({
      salesOrderId: ctx.input.salesOrderId,
      attachmentId: ctx.input.attachmentId,
      filename: ctx.input.filename
    });

    return {
      output: {
        salesOrderId: ctx.input.salesOrderId,
        attachmentId: ctx.input.attachmentId,
        filename: download.filename,
        mimeType: download.mimeType,
        sizeBytes: download.sizeBytes,
        attachmentCount: 1
      },
      message: `Downloaded PowerOffice sales order attachment **${download.filename}**.`,
      attachments: [createBase64Attachment(download.contentBase64, download.mimeType)]
    };
  })
  .build();
