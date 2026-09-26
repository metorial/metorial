import { createApiServiceError } from 'slates';
import { z } from 'zod';
import type { OracleCollectionPath, OracleFusionClient } from '../../lib/client';
import {
  booleanField,
  changeIndicator,
  idField,
  numberField,
  type OracleRecord,
  stringField
} from '../../lib/records';
import { resourceKeySchema } from '../../lib/schemas';

export const numericId = z
  .string()
  .regex(/^[0-9]+$/)
  .max(18)
  .describe(
    'Oracle business identifier as decimal digits. Discover this value with the corresponding lookup tool.'
  );
export const descriptionInput = z
  .string()
  .min(1)
  .max(240)
  .describe(
    'Document description, up to 240 characters. Use a unique description when creating a document so it can be found if the response is interrupted.'
  );
export const expectedIndicatorInput = z
  .string()
  .min(1)
  .max(4096)
  .describe(
    'Exact changeIndicator from the latest read of the document or line. The operation fails if Oracle reports a different indicator.'
  );
const text = (description: string) => z.string().optional().describe(description);
const nullableText = (description: string) =>
  z.string().nullable().optional().describe(description);
const nullableStringField = (record: OracleRecord, field: string) =>
  record[field] === null ? null : stringField(record, field);
const id = (description: string) => z.string().optional().describe(description);
const amount = (description: string) => z.number().optional().describe(description);
export const requisitionFields =
  'RequisitionHeaderId,Requisition,Description,Justification,DocumentStatus,DocumentStatusCode,PreparerId,Preparer,RequisitioningBUId,RequisitioningBU,SubmissionDate,ApprovedDate,CreationDate,LastUpdateDate';
export const draftOrderFields =
  'POHeaderId,OrderNumber,Description,Status,StatusCode,BuyerId,Buyer,DocumentStyleId,DocumentStyle,ProcurementBUId,ProcurementBU,RequisitioningBUId,RequisitioningBU,BillToBUId,BillToBU,BillToLocationId,BillToLocation,DefaultShipToLocationId,DefaultShipToLocation,SupplierId,Supplier,SupplierSiteId,SupplierSite,CurrencyCode,CancelFlag,ChangeOrderNumber,ChangeOrderStatusCode,ChangeOrderTypeCode,ChangeOrderInitiatingParty,CreationDate,LastUpdateDate';
export const requisitionLineFields =
  'RequisitionHeaderId,RequisitionLineId,LineNumber,LineStatus,ItemId,Item,ItemDescription,CategoryId,CategoryName,LineTypeId,LineType,Quantity,Price,UnitPrice,CurrencyCode,UOM,UOMCode,RequesterId,RequesterDisplayName,DeliverToLocationId,DeliverToLocationCode,DestinationOrganizationId,DestinationOrganizationCode,DestinationTypeCode,RequestedDeliveryDate,CancelDate,OriginalSubmittedDate,OriginalApprovalDate,LastUpdateDate';
export const orderLineFields =
  'POHeaderId,POLineId,LineNumber,ItemId,Item,Description,CategoryId,Category,LineTypeId,LineType,Quantity,Price,CurrencyCode,PricingUOM,PricingUOMCode,UOM,UOMCode,LastUpdateDate';
export const draftOrderLineFields = `${orderLineFields},CancelFlag`;
export const orderScheduleFields =
  'POHeaderId,POLineId,LineLocationId,ScheduleNumber,Quantity,Price,CurrencyCode,PricingUOM,PricingUOMCode,UOM,UOMCode,RequestedDeliveryDate,PromisedDeliveryDate,DestinationTypeCode,ShipToLocationId,ShipToLocationCode,ShipToOrganizationId,ShipToOrganizationCode,RequesterId,DeliverToLocationId,DeliverToLocation,Status,StatusCode,ReceivedQuantity,BilledQuantity,LastUpdateDate';

export const requisitionSchema = z.object({
  resourceKey: resourceKeySchema,
  requisitionId: z
    .string()
    .describe('Oracle RequisitionHeaderId, distinct from the opaque resourceKey.'),
  requisitionNumber: text('Business requisition number.'),
  description: text('Requisition description.'),
  justification: text('Business reason for the requisition.'),
  status: text('Display name of the requisition status.'),
  statusCode: text(
    'Oracle DocumentStatusCode. Only INCOMPLETE original documents can be edited.'
  ),
  preparerId: id('Oracle identifier of the preparer.'),
  preparer: text('Name of the requisition preparer.'),
  requisitioningBusinessUnitId: id('Oracle identifier of the requisitioning business unit.'),
  requisitioningBusinessUnit: text('Name of the requisitioning business unit.'),
  submittedAt: nullableText('Timestamp of submission for approval, when present.'),
  approvedAt: nullableText('Timestamp of approval, when present.'),
  changeIndicator: text(
    'Oracle concurrency indicator. Pass the latest value as expectedChangeIndicator when updating or deleting this document.'
  ),
  createdAt: text('Creation timestamp.'),
  updatedAt: text('Last update timestamp.')
});
export const draftOrderSchema = z.object({
  resourceKey: resourceKeySchema,
  purchaseOrderId: z
    .string()
    .describe('Oracle POHeaderId, distinct from the opaque resourceKey.'),
  orderNumber: text('Business purchase order number, scoped to the sold-to legal entity.'),
  description: text('Purchase order description.'),
  status: text('Display purchase order status.'),
  statusCode: text('Oracle status code. Only original INCOMPLETE orders can be edited.'),
  buyerId: id('Oracle buyer identifier.'),
  buyer: text('Buyer name.'),
  documentStyleId: id('Oracle document style identifier.'),
  documentStyle: text('Purchasing document style name.'),
  procurementBusinessUnitId: id('Oracle procurement business unit identifier.'),
  procurementBusinessUnit: text('Procurement business unit name.'),
  requisitioningBusinessUnitId: id('Oracle requisitioning business unit identifier.'),
  requisitioningBusinessUnit: text('Requisitioning business unit name.'),
  billToBusinessUnitId: id('Oracle bill-to business unit identifier.'),
  billToBusinessUnit: text('Bill-to business unit name.'),
  billToLocationId: id('Oracle bill-to location identifier.'),
  billToLocation: text('Bill-to location name.'),
  defaultShipToLocationId: id('Default ship-to location identifier.'),
  defaultShipToLocation: text('Default ship-to location name.'),
  supplierId: id('Oracle supplier identifier.'),
  supplier: text('Supplier name.'),
  supplierSiteId: id('Oracle supplier site identifier.'),
  supplierSite: text('Supplier site name.'),
  currencyCode: text('Purchase order currency code.'),
  canceled: z
    .boolean()
    .nullable()
    .optional()
    .describe('Cancellation flag; null is the unset value on an original incomplete order.'),
  changeOrderNumber: nullableText('Change order number, when this is a change order.'),
  changeOrderStatusCode: nullableText('Change order lifecycle code, when present.'),
  changeOrderTypeCode: nullableText('Change order type code.'),
  changeOrderInitiatingParty: nullableText('Party initiating a change order.'),
  changeIndicator: text('Latest Oracle concurrency indicator for expectedChangeIndicator.'),
  createdAt: text('Creation timestamp.'),
  updatedAt: text('Last update timestamp.')
});
const commonLineFields = {
  resourceKey: resourceKeySchema.describe(
    'Opaque key from this line self link. Use it only with its returned parentResourceKey.'
  ),
  parentResourceKey: resourceKeySchema.describe(
    'Opaque resourceKey of the document that owns this line.'
  ),
  lineNumber: amount('Business line number.'),
  itemId: id('Oracle catalog item identifier.'),
  itemNumber: text('Catalog item number.'),
  categoryId: id('Purchasing category identifier.'),
  categoryName: text('Purchasing category name.'),
  lineTypeId: id('Purchasing line type identifier.'),
  lineType: text('Purchasing line type name.'),
  quantity: amount('Quantity of the catalog item.'),
  unitPrice: amount('Unit price returned by Oracle.'),
  uom: text('Oracle unit of measure name.'),
  uomCode: text('Oracle unit of measure code, when returned.'),
  changeIndicator: text('Latest line concurrency indicator for expectedChangeIndicator.'),
  updatedAt: text('Last update timestamp.')
};
export const requisitionLineSchema = z.object({
  ...commonLineFields,
  unitPrice: amount('Oracle Price in the supplier currency identified by currencyCode.'),
  buyingCompanyUnitPrice: amount(
    'Oracle UnitPrice in the buying company currency. This currency basis can differ from currencyCode, which identifies the supplier currency.'
  ),
  requisitionLineId: z.string().describe('Oracle requisition line identifier.'),
  requisitionId: z.string().describe('Oracle identifier of the owning requisition.'),
  itemDescription: text('Description of the requested catalog item.'),
  statusCode: text('Requisition line status code.'),
  canceledAt: nullableText('Timestamp of line cancellation.'),
  originallySubmittedAt: nullableText('First line submission timestamp.'),
  originallyApprovedAt: nullableText('First line approval timestamp.'),
  currencyCode: text('Supplier currency code for unitPrice (Oracle Price).'),
  requesterId: id('Oracle identifier of the requester.'),
  requester: text('Requester display name.'),
  deliverToLocationId: id('Final delivery location identifier.'),
  deliverToLocationCode: text('Final delivery location code.'),
  destinationOrganizationId: id(
    'Inventory organization used for catalog item and delivery context.'
  ),
  destinationOrganizationCode: text('Destination inventory organization code.'),
  destinationTypeCode: text('Destination type, such as EXPENSE.'),
  requestedDeliveryDate: text('Requested delivery date in YYYY-MM-DD format.')
});
export const orderLineSchema = z.object({
  ...commonLineFields,
  unitPrice: amount('Oracle Price in currencyCode, per pricingUom when returned.'),
  currencyCode: text('Purchase order currency code for unitPrice.'),
  pricingUom: text('Unit of measure for pricing; it can differ from the quantity uom.'),
  pricingUomCode: text('Oracle code for the pricing unit of measure.'),
  purchaseOrderLineId: z.string().describe('Oracle POLineId.'),
  purchaseOrderId: z.string().describe('Oracle identifier of the owning purchase order.'),
  description: text('Purchase order line description.'),
  canceled: z
    .boolean()
    .nullable()
    .optional()
    .describe('Cancellation flag returned for draft order lines.')
});
export const orderScheduleSchema = z.object({
  resourceKey: resourceKeySchema,
  parentResourceKey: resourceKeySchema.describe(
    'Opaque resourceKey of the owning purchase order line.'
  ),
  purchaseOrderResourceKey: resourceKeySchema.describe(
    'Opaque resourceKey of the owning purchase order header.'
  ),
  scheduleId: z.string().describe('Oracle LineLocationId.'),
  purchaseOrderId: z.string().describe('Oracle POHeaderId.'),
  purchaseOrderLineId: z.string().describe('Oracle POLineId.'),
  scheduleNumber: amount('Business schedule number.'),
  quantity: amount('Scheduled quantity.'),
  unitPrice: amount('Oracle Price in currencyCode, per pricingUom when returned.'),
  currencyCode: text('Purchase order currency code for the schedule unitPrice.'),
  pricingUom: text('Unit of measure for pricing; it can differ from the quantity uom.'),
  pricingUomCode: text('Oracle code for the pricing unit of measure.'),
  uom: text('Unit of measure name for the scheduled quantity.'),
  uomCode: text('Oracle code for the scheduled quantity unit of measure.'),
  requestedDeliveryDate: text('Requested delivery date.'),
  promisedDeliveryDate: text('Supplier promised delivery date.'),
  destinationTypeCode: text('Destination type code.'),
  shipToLocationId: id('Ship-to location identifier.'),
  shipToLocationCode: text('Ship-to location code.'),
  shipToOrganizationId: id('Ship-to inventory organization identifier.'),
  shipToOrganizationCode: text('Ship-to inventory organization code.'),
  requesterId: id('Requester identifier.'),
  deliverToLocationId: id('Final delivery location identifier.'),
  deliverToLocation: text('Final delivery location name.'),
  status: text('Schedule lifecycle status.'),
  statusCode: text('Schedule lifecycle status code.'),
  receivedQuantity: amount('Quantity already received.'),
  billedQuantity: amount('Quantity already billed.'),
  updatedAt: text('Last update timestamp.')
});

export const requireId = (record: OracleRecord, field: string): string => {
  const value = idField(record, field);
  if (!value)
    throw createApiServiceError(
      `Oracle Fusion did not return the required ${field} identifier.`,
      { reason: 'oracle_fusion_invalid_response' }
    );
  return value;
};
export const assertParent = (record: OracleRecord, field: string, expectedId: string) => {
  if (requireId(record, field) !== expectedId)
    throw createApiServiceError(
      'The Oracle child resource does not belong to the requested parent.',
      { reason: 'oracle_fusion_parent_mismatch' }
    );
};
export const mapRequisition = (
  client: OracleFusionClient,
  record: OracleRecord
): z.infer<typeof requisitionSchema> => ({
  resourceKey: client.resourceKey(record, 'fscm', '/purchaseRequisitions'),
  requisitionId: requireId(record, 'RequisitionHeaderId'),
  requisitionNumber: stringField(record, 'Requisition'),
  description: stringField(record, 'Description'),
  justification: stringField(record, 'Justification'),
  status: stringField(record, 'DocumentStatus'),
  statusCode: stringField(record, 'DocumentStatusCode'),
  preparerId: idField(record, 'PreparerId'),
  preparer: stringField(record, 'Preparer'),
  requisitioningBusinessUnitId: idField(record, 'RequisitioningBUId'),
  requisitioningBusinessUnit: stringField(record, 'RequisitioningBU'),
  submittedAt: nullableStringField(record, 'SubmissionDate'),
  approvedAt: nullableStringField(record, 'ApprovedDate'),
  changeIndicator: changeIndicator(record),
  createdAt: stringField(record, 'CreationDate'),
  updatedAt: stringField(record, 'LastUpdateDate')
});
export const mapDraftOrder = (
  client: OracleFusionClient,
  record: OracleRecord
): z.infer<typeof draftOrderSchema> => ({
  resourceKey: client.resourceKey(record, 'fscm', '/draftPurchaseOrders'),
  purchaseOrderId: requireId(record, 'POHeaderId'),
  orderNumber: stringField(record, 'OrderNumber'),
  description: stringField(record, 'Description'),
  status: stringField(record, 'Status'),
  statusCode: stringField(record, 'StatusCode'),
  buyerId: idField(record, 'BuyerId'),
  buyer: stringField(record, 'Buyer'),
  documentStyleId: idField(record, 'DocumentStyleId'),
  documentStyle: stringField(record, 'DocumentStyle'),
  procurementBusinessUnitId: idField(record, 'ProcurementBUId'),
  procurementBusinessUnit: stringField(record, 'ProcurementBU'),
  requisitioningBusinessUnitId: idField(record, 'RequisitioningBUId'),
  requisitioningBusinessUnit: stringField(record, 'RequisitioningBU'),
  billToBusinessUnitId: idField(record, 'BillToBUId'),
  billToBusinessUnit: stringField(record, 'BillToBU'),
  billToLocationId: idField(record, 'BillToLocationId'),
  billToLocation: stringField(record, 'BillToLocation'),
  defaultShipToLocationId: idField(record, 'DefaultShipToLocationId'),
  defaultShipToLocation: stringField(record, 'DefaultShipToLocation'),
  supplierId: idField(record, 'SupplierId'),
  supplier: stringField(record, 'Supplier'),
  supplierSiteId: idField(record, 'SupplierSiteId'),
  supplierSite: stringField(record, 'SupplierSite'),
  currencyCode: stringField(record, 'CurrencyCode'),
  canceled: record.CancelFlag === null ? null : booleanField(record, 'CancelFlag'),
  changeOrderNumber: nullableStringField(record, 'ChangeOrderNumber'),
  changeOrderStatusCode: nullableStringField(record, 'ChangeOrderStatusCode'),
  changeOrderTypeCode: nullableStringField(record, 'ChangeOrderTypeCode'),
  changeOrderInitiatingParty: nullableStringField(record, 'ChangeOrderInitiatingParty'),
  changeIndicator: changeIndicator(record),
  createdAt: stringField(record, 'CreationDate'),
  updatedAt: stringField(record, 'LastUpdateDate')
});
const mapLine = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  parentKey: string,
  record: OracleRecord,
  isRequisition: boolean
) => ({
  resourceKey: client.resourceKey(record, 'fscm', collection),
  parentResourceKey: parentKey,
  lineNumber: numberField(record, 'LineNumber'),
  itemId: idField(record, 'ItemId'),
  itemNumber: stringField(record, 'Item'),
  categoryId: idField(record, 'CategoryId'),
  categoryName: stringField(record, isRequisition ? 'CategoryName' : 'Category'),
  lineTypeId: idField(record, 'LineTypeId'),
  lineType: stringField(record, 'LineType'),
  quantity: numberField(record, 'Quantity'),
  unitPrice: numberField(record, 'Price'),
  uom: stringField(record, 'UOM'),
  uomCode: stringField(record, 'UOMCode'),
  changeIndicator: changeIndicator(record),
  updatedAt: stringField(record, 'LastUpdateDate')
});
export const mapRequisitionLine = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  parentKey: string,
  record: OracleRecord
): z.infer<typeof requisitionLineSchema> => ({
  ...mapLine(client, collection, parentKey, record, true),
  buyingCompanyUnitPrice: numberField(record, 'UnitPrice'),
  requisitionLineId: requireId(record, 'RequisitionLineId'),
  requisitionId: requireId(record, 'RequisitionHeaderId'),
  itemDescription: stringField(record, 'ItemDescription'),
  statusCode: stringField(record, 'LineStatus'),
  canceledAt: nullableStringField(record, 'CancelDate'),
  originallySubmittedAt: nullableStringField(record, 'OriginalSubmittedDate'),
  originallyApprovedAt: nullableStringField(record, 'OriginalApprovalDate'),
  currencyCode: stringField(record, 'CurrencyCode'),
  requesterId: idField(record, 'RequesterId'),
  requester: stringField(record, 'RequesterDisplayName'),
  deliverToLocationId: idField(record, 'DeliverToLocationId'),
  deliverToLocationCode: stringField(record, 'DeliverToLocationCode'),
  destinationOrganizationId: idField(record, 'DestinationOrganizationId'),
  destinationOrganizationCode: stringField(record, 'DestinationOrganizationCode'),
  destinationTypeCode: stringField(record, 'DestinationTypeCode'),
  requestedDeliveryDate: stringField(record, 'RequestedDeliveryDate')
});
export const mapOrderLine = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  parentKey: string,
  record: OracleRecord
): z.infer<typeof orderLineSchema> => ({
  ...mapLine(client, collection, parentKey, record, false),
  currencyCode: stringField(record, 'CurrencyCode'),
  pricingUom: stringField(record, 'PricingUOM'),
  pricingUomCode: stringField(record, 'PricingUOMCode'),
  purchaseOrderLineId: requireId(record, 'POLineId'),
  purchaseOrderId: requireId(record, 'POHeaderId'),
  description: stringField(record, 'Description'),
  canceled: record.CancelFlag === null ? null : booleanField(record, 'CancelFlag')
});
export const mapSchedule = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  headerKey: string,
  lineKey: string,
  record: OracleRecord
): z.infer<typeof orderScheduleSchema> => ({
  resourceKey: client.resourceKey(record, 'fscm', collection),
  parentResourceKey: lineKey,
  purchaseOrderResourceKey: headerKey,
  scheduleId: requireId(record, 'LineLocationId'),
  purchaseOrderId: requireId(record, 'POHeaderId'),
  purchaseOrderLineId: requireId(record, 'POLineId'),
  scheduleNumber: numberField(record, 'ScheduleNumber'),
  quantity: numberField(record, 'Quantity'),
  unitPrice: numberField(record, 'Price'),
  currencyCode: stringField(record, 'CurrencyCode'),
  pricingUom: stringField(record, 'PricingUOM'),
  pricingUomCode: stringField(record, 'PricingUOMCode'),
  uom: stringField(record, 'UOM'),
  uomCode: stringField(record, 'UOMCode'),
  requestedDeliveryDate: stringField(record, 'RequestedDeliveryDate'),
  promisedDeliveryDate: stringField(record, 'PromisedDeliveryDate'),
  destinationTypeCode: stringField(record, 'DestinationTypeCode'),
  shipToLocationId: idField(record, 'ShipToLocationId'),
  shipToLocationCode: stringField(record, 'ShipToLocationCode'),
  shipToOrganizationId: idField(record, 'ShipToOrganizationId'),
  shipToOrganizationCode: stringField(record, 'ShipToOrganizationCode'),
  requesterId: idField(record, 'RequesterId'),
  deliverToLocationId: idField(record, 'DeliverToLocationId'),
  deliverToLocation: stringField(record, 'DeliverToLocation'),
  status: stringField(record, 'Status'),
  statusCode: stringField(record, 'StatusCode'),
  receivedQuantity: numberField(record, 'ReceivedQuantity'),
  billedQuantity: numberField(record, 'BilledQuantity'),
  updatedAt: stringField(record, 'LastUpdateDate')
});
