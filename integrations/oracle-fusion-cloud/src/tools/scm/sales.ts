import { SlateTool } from 'slates';
import { z } from 'zod';
import { type OracleCollectionPath, OracleFusionClient } from '../../lib/client';
import { oracleDateSchema, validateOracleDateRange } from '../../lib/dates';
import { adfEquals, adfIdEquals, andFilters } from '../../lib/filters';
import { oracleFinder } from '../../lib/finders';
import {
  booleanField,
  idField,
  numberField,
  type OracleRecord,
  stringField
} from '../../lib/records';
import { pageOutputFields, paginationInputFields, resourceKeySchema } from '../../lib/schemas';
import { spec } from '../../spec';
import { mapResource, numericIdSchema, requiredId, resourceFields } from './models';

const COLLECTION = '/salesOrdersForOrderHub';
const ORDER_FILTER_FIELDS = [
  'OrderNumber',
  'StatusCode',
  'BusinessUnitId',
  'BuyingPartyId',
  'SourceTransactionSystem',
  'SourceTransactionNumber'
] as const;
const LINE_FILTER_FIELDS = ['FulfillLineId', 'ProductNumber', 'StatusCode'] as const;
const ORDER_FIELDS = [
  'HeaderId',
  'OrderNumber',
  'StatusCode',
  'Status',
  'BusinessUnitId',
  'BusinessUnitName',
  'BuyingPartyId',
  'BuyingPartyName',
  'BuyingPartyNumber',
  'CustomerPONumber',
  'TransactionOn',
  'TransactionalCurrencyCode',
  'SourceTransactionId',
  'SourceTransactionNumber',
  'SourceTransactionSystem',
  'SubmittedFlag',
  'OpenFlag',
  'CanceledFlag',
  'OnHoldFlag'
].join(',');
const LINE_FIELDS = [
  'HeaderId',
  'FulfillLineId',
  'LineId',
  'LineNumber',
  'FulfillLineNumber',
  'ProductId',
  'ProductNumber',
  'ProductDescription',
  'OrderedQuantity',
  'OrderedUOMCode',
  'OrderedUOM',
  'ShippedQuantity',
  'ShippedUOMCode',
  'StatusCode',
  'Status',
  'RequestedFulfillmentOrganizationId',
  'RequestedFulfillmentOrganizationCode',
  'ScheduleShipDate',
  'ActualShipDate',
  'SourceTransactionLineId',
  'SourceTransactionScheduleId'
].join(',');

const salesOrderKeySchema = resourceKeySchema.describe(
  'Opaque resourceKey returned by list_sales_orders or get_sales_order. Use this exact value; a header ID or sales order number is not the resource key.'
);
const salesOrderSchema = z.object({
  ...resourceFields,
  headerId: z
    .string()
    .describe(
      'Sales order header business ID represented as a string, distinct from resourceKey.'
    ),
  orderNumber: z.string().optional().describe('Sales order number.'),
  statusCode: z.string().optional().describe('Sales order status code.'),
  status: z.string().optional().describe('Sales order status name.'),
  businessUnitId: z
    .string()
    .optional()
    .describe('Selling business unit ID represented as a string.'),
  businessUnitName: z.string().optional().describe('Selling business unit name.'),
  customerId: z
    .string()
    .optional()
    .describe('Sold-to customer party ID represented as a string.'),
  customerName: z.string().optional().describe('Sold-to customer name.'),
  customerNumber: z.string().optional().describe('Sold-to customer number.'),
  customerPoNumber: z.string().optional().describe('Customer purchase order reference.'),
  transactionDate: z
    .string()
    .optional()
    .describe('Date and time when the customer committed to purchase the order items.'),
  currencyCode: z.string().optional().describe('Transaction currency code.'),
  sourceTransactionId: z
    .string()
    .optional()
    .describe('Transaction ID in the source application.'),
  sourceTransactionNumber: z
    .string()
    .optional()
    .describe('Transaction number in the source application.'),
  sourceTransactionSystem: z
    .string()
    .optional()
    .describe('Source application that created the sales order.'),
  submitted: z.boolean().optional().describe('Whether the order was validated and submitted.'),
  open: z.boolean().optional().describe('Whether the sales order is open.'),
  canceled: z.boolean().optional().describe('Whether the sales order is canceled.'),
  onHold: z.boolean().optional().describe('Whether the sales order is on hold.')
});

const salesOrderLineSchema = z.object({
  ...resourceFields,
  headerId: z
    .string()
    .describe('Parent sales order header business ID represented as a string.'),
  fulfillLineId: z
    .string()
    .describe(
      'Fulfillment line business ID represented as a string, distinct from resourceKey.'
    ),
  lineId: z.string().describe('Sales order line business ID represented as a string.'),
  lineNumber: z
    .string()
    .optional()
    .describe('Sales order line number represented as a string.'),
  fulfillLineNumber: z
    .string()
    .optional()
    .describe('Fulfillment line number within the order line.'),
  productId: z.string().optional().describe('Inventory item ID represented as a string.'),
  productNumber: z
    .string()
    .optional()
    .describe('Inventory item number or stock keeping unit.'),
  description: z.string().optional().describe('Inventory item description.'),
  orderedQuantity: z.number().optional().describe('Quantity ordered in orderedUomCode.'),
  orderedUomCode: z.string().optional().describe('Unit of measure code for orderedQuantity.'),
  orderedUom: z.string().optional().describe('Unit of measure name for orderedQuantity.'),
  shippedQuantity: z.number().optional().describe('Quantity shipped in shippedUomCode.'),
  shippedUomCode: z.string().optional().describe('Unit of measure code for shippedQuantity.'),
  statusCode: z.string().optional().describe('Fulfillment line status code.'),
  status: z.string().optional().describe('Fulfillment line status name.'),
  fulfillmentOrganizationId: z
    .string()
    .optional()
    .describe('Requested fulfillment organization ID represented as a string.'),
  fulfillmentOrganizationCode: z
    .string()
    .optional()
    .describe('Requested fulfillment organization code.'),
  scheduledShipDate: z.string().optional().describe('Scheduled shipment date and time.'),
  actualShipDate: z.string().optional().describe('Actual shipment date and time.'),
  sourceTransactionLineId: z
    .string()
    .optional()
    .describe('Line ID in the source application.'),
  sourceTransactionScheduleId: z
    .string()
    .optional()
    .describe('Schedule or subline ID in the source application.')
});

const mapSalesOrder = (
  client: OracleFusionClient,
  record: OracleRecord
): z.infer<typeof salesOrderSchema> => ({
  ...mapResource(client, COLLECTION, record),
  headerId: requiredId(record, 'HeaderId'),
  orderNumber: stringField(record, 'OrderNumber'),
  statusCode: stringField(record, 'StatusCode'),
  status: stringField(record, 'Status'),
  businessUnitId: idField(record, 'BusinessUnitId'),
  businessUnitName: stringField(record, 'BusinessUnitName'),
  customerId: idField(record, 'BuyingPartyId'),
  customerName: stringField(record, 'BuyingPartyName'),
  customerNumber: stringField(record, 'BuyingPartyNumber'),
  customerPoNumber: stringField(record, 'CustomerPONumber'),
  transactionDate: stringField(record, 'TransactionOn'),
  currencyCode: stringField(record, 'TransactionalCurrencyCode'),
  sourceTransactionId: stringField(record, 'SourceTransactionId'),
  sourceTransactionNumber: stringField(record, 'SourceTransactionNumber'),
  sourceTransactionSystem: stringField(record, 'SourceTransactionSystem'),
  submitted: booleanField(record, 'SubmittedFlag'),
  open: booleanField(record, 'OpenFlag'),
  canceled: booleanField(record, 'CanceledFlag'),
  onHold: booleanField(record, 'OnHoldFlag')
});

const mapSalesOrderLine = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  record: OracleRecord
): z.infer<typeof salesOrderLineSchema> => ({
  ...mapResource(client, collection, record),
  headerId: requiredId(record, 'HeaderId'),
  fulfillLineId: requiredId(record, 'FulfillLineId'),
  lineId: requiredId(record, 'LineId'),
  lineNumber: idField(record, 'LineNumber'),
  fulfillLineNumber: stringField(record, 'FulfillLineNumber'),
  productId: idField(record, 'ProductId'),
  productNumber: stringField(record, 'ProductNumber'),
  description: stringField(record, 'ProductDescription'),
  orderedQuantity: numberField(record, 'OrderedQuantity'),
  orderedUomCode: stringField(record, 'OrderedUOMCode'),
  orderedUom: stringField(record, 'OrderedUOM'),
  shippedQuantity: numberField(record, 'ShippedQuantity'),
  shippedUomCode: stringField(record, 'ShippedUOMCode'),
  statusCode: stringField(record, 'StatusCode'),
  status: stringField(record, 'Status'),
  fulfillmentOrganizationId: idField(record, 'RequestedFulfillmentOrganizationId'),
  fulfillmentOrganizationCode: stringField(record, 'RequestedFulfillmentOrganizationCode'),
  scheduledShipDate: stringField(record, 'ScheduleShipDate'),
  actualShipDate: stringField(record, 'ActualShipDate'),
  sourceTransactionLineId: stringField(record, 'SourceTransactionLineId'),
  sourceTransactionScheduleId: stringField(record, 'SourceTransactionScheduleId')
});

export const listSalesOrders = SlateTool.create(spec, {
  key: 'list_sales_orders',
  name: 'List Sales Orders',
  description:
    'List Oracle Order Management sales orders with customers, statuses, business units, currency, and source references. Use resourceKey from the selected order with get_sales_order and list_sales_order_lines.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      orderNumber: z.string().min(1).max(50).optional().describe('Exact sales order number.'),
      statusCode: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe('Exact sales order status code, such as OPEN.'),
      businessUnitId: numericIdSchema
        .optional()
        .describe(
          'Exact selling business unit ID represented as a string. Call list_business_units to discover business unit IDs.'
        ),
      customerId: numericIdSchema
        .optional()
        .describe('Exact sold-to customer party ID represented as a string.'),
      sourceTransactionSystem: z
        .string()
        .min(1)
        .max(50)
        .optional()
        .describe('Exact source application code.'),
      sourceTransactionNumber: z
        .string()
        .min(1)
        .max(50)
        .optional()
        .describe('Exact transaction number assigned by the source application.'),
      orderedFrom: oracleDateSchema
        .optional()
        .describe(
          'Start date for the Oracle ordered-date finder in YYYY-MM-DD format. Supply orderedTo as well.'
        ),
      orderedTo: oracleDateSchema
        .optional()
        .describe(
          'End date for the Oracle ordered-date finder in YYYY-MM-DD format. Supply orderedFrom as well.'
        )
    })
  )
  .output(z.object({ items: z.array(salesOrderSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    validateOracleDateRange(ctx.input.orderedFrom, ctx.input.orderedTo);
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('fscm', COLLECTION, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      finder:
        ctx.input.orderedFrom !== undefined && ctx.input.orderedTo !== undefined
          ? oracleFinder('findByOrderedDate', {
              FromDate: ctx.input.orderedFrom,
              ToDate: ctx.input.orderedTo
            })
          : undefined,
      q: andFilters(
        ctx.input.orderNumber !== undefined
          ? adfEquals('OrderNumber', ctx.input.orderNumber, ORDER_FILTER_FIELDS)
          : undefined,
        ctx.input.statusCode !== undefined
          ? adfEquals('StatusCode', ctx.input.statusCode, ORDER_FILTER_FIELDS)
          : undefined,
        adfIdEquals('BusinessUnitId', ctx.input.businessUnitId, ORDER_FILTER_FIELDS),
        adfIdEquals('BuyingPartyId', ctx.input.customerId, ORDER_FILTER_FIELDS),
        ctx.input.sourceTransactionSystem !== undefined
          ? adfEquals(
              'SourceTransactionSystem',
              ctx.input.sourceTransactionSystem,
              ORDER_FILTER_FIELDS
            )
          : undefined,
        ctx.input.sourceTransactionNumber !== undefined
          ? adfEquals(
              'SourceTransactionNumber',
              ctx.input.sourceTransactionNumber,
              ORDER_FILTER_FIELDS
            )
          : undefined
      ),
      orderBy: 'HeaderId:asc',
      fields: ORDER_FIELDS,
      links: 'self'
    });
    return {
      output: { ...page, items: page.items.map(record => mapSalesOrder(client, record)) },
      message: `Found ${page.count} sales orders.`
    };
  })
  .build();

export const getSalesOrder = SlateTool.create(spec, {
  key: 'get_sales_order',
  name: 'Get Sales Order',
  description:
    'Retrieve one Oracle Order Management sales order with customer, status, business unit, currency, and source references. Call list_sales_orders to obtain resourceKey and pass it as salesOrderKey.',
  tags: { readOnly: true }
})
  .input(z.object({ salesOrderKey: salesOrderKeySchema }))
  .output(salesOrderSchema)
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let record = await client.get('fscm', COLLECTION, ctx.input.salesOrderKey, {
      fields: ORDER_FIELDS,
      links: 'self'
    });
    return { output: mapSalesOrder(client, record), message: 'Retrieved the sales order.' };
  })
  .build();

export const listSalesOrderLines = SlateTool.create(spec, {
  key: 'list_sales_order_lines',
  name: 'List Sales Order Lines',
  description:
    'List the fulfillment lines of one sales order with product IDs and numbers, ordered and shipped quantities and their units, status, and shipment dates. Call list_sales_orders or get_sales_order to obtain the parent resourceKey and pass it as salesOrderKey.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      salesOrderKey: salesOrderKeySchema,
      ...paginationInputFields,
      fulfillLineId: numericIdSchema
        .optional()
        .describe('Exact fulfillment line ID represented as a string.'),
      productNumber: z
        .string()
        .min(1)
        .max(300)
        .optional()
        .describe('Exact inventory item number or stock keeping unit.'),
      statusCode: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe('Exact fulfillment line status code, such as BACKORDERED.')
    })
  )
  .output(z.object({ items: z.array(salesOrderLineSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let collection = client.childCollectionPath(COLLECTION, ctx.input.salesOrderKey, 'lines');
    let page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q: andFilters(
        adfIdEquals('FulfillLineId', ctx.input.fulfillLineId, LINE_FILTER_FIELDS),
        ctx.input.productNumber !== undefined
          ? adfEquals('ProductNumber', ctx.input.productNumber, LINE_FILTER_FIELDS)
          : undefined,
        ctx.input.statusCode !== undefined
          ? adfEquals('StatusCode', ctx.input.statusCode, LINE_FILTER_FIELDS)
          : undefined
      ),
      orderBy: 'FulfillLineId:asc',
      fields: LINE_FIELDS,
      links: 'self'
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => mapSalesOrderLine(client, collection, record))
      },
      message: `Found ${page.count} sales order fulfillment lines.`
    };
  })
  .build();
