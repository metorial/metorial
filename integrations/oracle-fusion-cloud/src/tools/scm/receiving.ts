import { SlateTool } from 'slates';
import { z } from 'zod';
import { OracleFusionClient } from '../../lib/client';
import { oracleDateSchema, validateOracleDateRange } from '../../lib/dates';
import { adfComparison, adfEquals, adfIdEquals, andFilters } from '../../lib/filters';
import { oracleFinder } from '../../lib/finders';
import { idField, numberField, type OracleRecord, stringField } from '../../lib/records';
import { pageOutputFields, paginationInputFields } from '../../lib/schemas';
import { spec } from '../../spec';
import {
  itemIdSchema,
  itemNumberSchema,
  mapResource,
  numericIdSchema,
  organizationCodeSchema,
  organizationIdSchema,
  requiredId,
  resourceFields
} from './models';

const COLLECTION = '/receivingTransactionsHistory';
const FILTER_FIELDS = [
  'ReceiptNumber',
  'POHeaderId',
  'PONumber',
  'OrganizationId',
  'OrganizationCode',
  'ItemId',
  'ItemNumber',
  'TransactionTypeCode',
  'TransactionDate'
] as const;
const FIELDS = [
  'TransactionId',
  'TransactionType',
  'TransactionTypeCode',
  'TransactionDate',
  'ReceiptNumber',
  'ShipmentHeaderId',
  'ShipmentLineId',
  'ParentTransactionId',
  'OrganizationId',
  'OrganizationCode',
  'ItemId',
  'ItemNumber',
  'ItemDescription',
  'Quantity',
  'UOMCode',
  'UnitOfMeasure',
  'PrimaryQuantity',
  'PrimaryUOMCode',
  'PrimaryUnitOfMeasure',
  'POHeaderId',
  'PONumber',
  'POLineId',
  'POLineNumber',
  'POLineLocationId',
  'POShipmentNumber',
  'SourceDocumentCode',
  'VendorId',
  'VendorName',
  'VendorSiteId',
  'Subinventory',
  'LocatorId',
  'Locator',
  'DestinationType',
  'DestinationTypeCode'
].join(',');

const receivingTransactionSchema = z.object({
  ...resourceFields,
  transactionId: z
    .string()
    .describe(
      'Completed receiving transaction ID represented as a string, distinct from resourceKey.'
    ),
  shipmentHeaderId: z.string().describe('Receipt shipment header ID represented as a string.'),
  shipmentLineId: z.string().describe('Receipt shipment line ID represented as a string.'),
  parentTransactionId: z
    .string()
    .optional()
    .describe('Parent receiving transaction ID represented as a string.'),
  transactionType: z.string().optional().describe('Receiving transaction type name.'),
  transactionTypeCode: z
    .string()
    .optional()
    .describe('Receiving transaction type code, such as RECEIVE or DELIVER.'),
  transactionDate: z
    .string()
    .optional()
    .describe('Date when the receiving transaction occurred.'),
  receiptNumber: z
    .string()
    .optional()
    .describe('Receipt number used to correlate completed receipt history.'),
  organizationId: z
    .string()
    .optional()
    .describe('Receiving inventory organization ID represented as a string.'),
  organizationCode: z.string().optional().describe('Receiving inventory organization code.'),
  itemId: z.string().optional().describe('Inventory item ID represented as a string.'),
  itemNumber: z.string().optional().describe('Inventory item number.'),
  description: z.string().optional().describe('Inventory item description.'),
  quantity: z.number().optional().describe('Transaction quantity in uomCode.'),
  uomCode: z.string().optional().describe('Transaction unit of measure code for quantity.'),
  unitOfMeasure: z.string().optional().describe('Transaction unit of measure name.'),
  primaryQuantity: z.number().optional().describe('Transaction quantity in primaryUomCode.'),
  primaryUomCode: z
    .string()
    .optional()
    .describe('Item primary unit of measure code for primaryQuantity.'),
  primaryUnitOfMeasure: z.string().optional().describe('Item primary unit of measure name.'),
  purchaseOrderId: z
    .string()
    .optional()
    .describe('Purchase order header ID represented as a string.'),
  purchaseOrderNumber: z
    .string()
    .optional()
    .describe('Purchase order number associated with the receipt.'),
  purchaseOrderLineId: z
    .string()
    .optional()
    .describe('Purchase order line ID represented as a string.'),
  purchaseOrderLineNumber: z
    .string()
    .optional()
    .describe('Purchase order line number represented as a string.'),
  purchaseOrderScheduleId: z
    .string()
    .optional()
    .describe('Purchase order schedule ID represented as a string.'),
  purchaseOrderScheduleNumber: z
    .string()
    .optional()
    .describe('Purchase order schedule number represented as a string.'),
  sourceDocumentCode: z.string().optional().describe('Source document type code.'),
  supplierId: z.string().optional().describe('Supplier ID represented as a string.'),
  supplierName: z.string().optional().describe('Supplier name.'),
  supplierSiteId: z.string().optional().describe('Supplier site ID represented as a string.'),
  subinventoryCode: z.string().optional().describe('Destination subinventory code.'),
  locatorId: z.string().optional().describe('Destination locator ID represented as a string.'),
  locatorName: z.string().optional().describe('Destination locator name.'),
  destinationType: z.string().optional().describe('Receiving destination type name.'),
  destinationTypeCode: z.string().optional().describe('Receiving destination type code.')
});

const mapReceivingTransaction = (
  client: OracleFusionClient,
  record: OracleRecord
): z.infer<typeof receivingTransactionSchema> => ({
  ...mapResource(client, COLLECTION, record),
  transactionId: requiredId(record, 'TransactionId'),
  shipmentHeaderId: requiredId(record, 'ShipmentHeaderId'),
  shipmentLineId: requiredId(record, 'ShipmentLineId'),
  parentTransactionId: idField(record, 'ParentTransactionId'),
  transactionType: stringField(record, 'TransactionType'),
  transactionTypeCode: stringField(record, 'TransactionTypeCode'),
  transactionDate: stringField(record, 'TransactionDate'),
  receiptNumber: stringField(record, 'ReceiptNumber'),
  organizationId: idField(record, 'OrganizationId'),
  organizationCode: stringField(record, 'OrganizationCode'),
  itemId: idField(record, 'ItemId'),
  itemNumber: stringField(record, 'ItemNumber'),
  description: stringField(record, 'ItemDescription'),
  quantity: numberField(record, 'Quantity'),
  uomCode: stringField(record, 'UOMCode'),
  unitOfMeasure: stringField(record, 'UnitOfMeasure'),
  primaryQuantity: numberField(record, 'PrimaryQuantity'),
  primaryUomCode: stringField(record, 'PrimaryUOMCode'),
  primaryUnitOfMeasure: stringField(record, 'PrimaryUnitOfMeasure'),
  purchaseOrderId: idField(record, 'POHeaderId'),
  purchaseOrderNumber: stringField(record, 'PONumber'),
  purchaseOrderLineId: idField(record, 'POLineId'),
  purchaseOrderLineNumber: idField(record, 'POLineNumber'),
  purchaseOrderScheduleId: idField(record, 'POLineLocationId'),
  purchaseOrderScheduleNumber: idField(record, 'POShipmentNumber'),
  sourceDocumentCode: stringField(record, 'SourceDocumentCode'),
  supplierId: idField(record, 'VendorId'),
  supplierName: stringField(record, 'VendorName'),
  supplierSiteId: idField(record, 'VendorSiteId'),
  subinventoryCode: stringField(record, 'Subinventory'),
  locatorId: idField(record, 'LocatorId'),
  locatorName: stringField(record, 'Locator'),
  destinationType: stringField(record, 'DestinationType'),
  destinationTypeCode: stringField(record, 'DestinationTypeCode')
});

export const listReceivingTransactions = SlateTool.create(spec, {
  key: 'list_receiving_transactions',
  name: 'List Receiving Transactions',
  description:
    "List completed receiving transaction history with receipt and purchase order references, inventory organization, item, quantities, and units of measure. Call list_inventory_organizations and list_items to discover organization and item IDs. Lot or serial filters use Oracle's lot-and-serial finder, which is unsupported when a transaction contains more than 15 serial numbers.",
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      receiptNumber: z.string().min(1).max(30).optional().describe('Exact receipt number.'),
      purchaseOrderId: numericIdSchema
        .optional()
        .describe(
          'Exact purchase order header ID represented as a string. Call list_purchase_orders to discover IDs.'
        ),
      purchaseOrderNumber: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe('Exact purchase order number associated with the receipt.'),
      organizationId: organizationIdSchema.optional(),
      organizationCode: organizationCodeSchema.optional(),
      itemId: itemIdSchema.optional(),
      itemNumber: itemNumberSchema.optional(),
      transactionTypeCode: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe('Exact receiving transaction type code, such as RECEIVE or DELIVER.'),
      transactionFrom: oracleDateSchema
        .optional()
        .describe(
          'Inclusive start transaction date in YYYY-MM-DD format. Supply transactionTo as well.'
        ),
      transactionTo: oracleDateSchema
        .optional()
        .describe(
          'Inclusive end transaction date in YYYY-MM-DD format. Supply transactionFrom as well.'
        ),
      lotNumber: z
        .string()
        .min(1)
        .max(80)
        .optional()
        .describe("Exact lot number to find through Oracle's lot-and-serial finder."),
      serialNumber: z
        .string()
        .min(1)
        .max(80)
        .optional()
        .describe(
          "Exact item serial number. Oracle's finder does not support transactions containing more than 15 serial numbers."
        )
    })
  )
  .output(z.object({ items: z.array(receivingTransactionSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    validateOracleDateRange(ctx.input.transactionFrom, ctx.input.transactionTo);
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('fscm', COLLECTION, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      finder:
        ctx.input.lotNumber !== undefined || ctx.input.serialNumber !== undefined
          ? oracleFinder('findByLotAndSerial', {
              ItemId: ctx.input.itemId,
              ItemNumber: ctx.input.itemNumber,
              LotNumber: ctx.input.lotNumber,
              OrganizationCode: ctx.input.organizationCode,
              OrganizationId: ctx.input.organizationId,
              SerialNumber: ctx.input.serialNumber
            })
          : undefined,
      q: andFilters(
        ctx.input.receiptNumber !== undefined
          ? adfEquals('ReceiptNumber', ctx.input.receiptNumber, FILTER_FIELDS)
          : undefined,
        adfIdEquals('POHeaderId', ctx.input.purchaseOrderId, FILTER_FIELDS),
        ctx.input.purchaseOrderNumber !== undefined
          ? adfEquals('PONumber', ctx.input.purchaseOrderNumber, FILTER_FIELDS)
          : undefined,
        adfIdEquals('OrganizationId', ctx.input.organizationId, FILTER_FIELDS),
        ctx.input.organizationCode !== undefined
          ? adfEquals('OrganizationCode', ctx.input.organizationCode, FILTER_FIELDS)
          : undefined,
        adfIdEquals('ItemId', ctx.input.itemId, FILTER_FIELDS),
        ctx.input.itemNumber !== undefined
          ? adfEquals('ItemNumber', ctx.input.itemNumber, FILTER_FIELDS)
          : undefined,
        ctx.input.transactionTypeCode !== undefined
          ? adfEquals('TransactionTypeCode', ctx.input.transactionTypeCode, FILTER_FIELDS)
          : undefined,
        ctx.input.transactionFrom !== undefined
          ? adfComparison('TransactionDate', '>=', ctx.input.transactionFrom, FILTER_FIELDS)
          : undefined,
        ctx.input.transactionTo !== undefined
          ? adfComparison('TransactionDate', '<=', ctx.input.transactionTo, FILTER_FIELDS)
          : undefined
      ),
      orderBy: 'TransactionId:asc',
      fields: FIELDS,
      links: 'self'
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => mapReceivingTransaction(client, record))
      },
      message: `Found ${page.count} completed receiving transactions.`
    };
  })
  .build();
