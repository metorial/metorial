import { SlateTool } from 'slates';
import { z } from 'zod';
import { OracleFusionClient } from '../../lib/client';
import { adfEquals, adfIdEquals, andFilters } from '../../lib/filters';
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

const ON_HAND_COLLECTION = '/inventoryOutboundItemQuantitiesSummaries';
const RESERVATIONS_COLLECTION = '/inventoryReservations';
const INVENTORY_FILTER_FIELDS = [
  'OrganizationId',
  'OrganizationCode',
  'InventoryItemId',
  'ItemNumber',
  'SubinventoryCode',
  'LocatorId',
  'LotNumber'
] as const;
const RESERVATION_FILTER_FIELDS = [
  ...INVENTORY_FILTER_FIELDS,
  'ReservationId',
  'DemandSourceHeaderNumber',
  'DemandSourceType'
] as const;
const ON_HAND_FIELDS = [
  'OnhandSummaryId',
  'OrganizationId',
  'OrganizationCode',
  'InventoryItemId',
  'ItemNumber',
  'SubinventoryCode',
  'LocatorId',
  'LocatorName',
  'LotNumber',
  'Revision',
  'Quantity',
  'PrimaryUOMCode',
  'PrimaryUOM',
  'SecondaryUOMQuantity',
  'SecondaryUOMCode',
  'SecondaryUOM'
].join(',');
const RESERVATION_FIELDS = [
  'ReservationId',
  'OrganizationId',
  'OrganizationCode',
  'InventoryItemId',
  'ItemNumber',
  'ItemDescription',
  'SubinventoryCode',
  'LocatorId',
  'Locator',
  'LotNumber',
  'Revision',
  'ReservationQuantity',
  'ReservationUOMCode',
  'ReservationUnitOfMeasure',
  'PrimaryReservationQuantity',
  'PrimaryUOMCode',
  'PrimaryUnitOfMeasure',
  'SecondaryReservationQuantity',
  'SecondaryUOMCode',
  'SecondaryUnitOfMeasure',
  'RequirementDate',
  'DemandSourceType',
  'DemandSourceHeaderId',
  'DemandSourceHeaderNumber',
  'DemandSourceLineId',
  'DemandSourceLineNumber',
  'SourceFulfillmentLineId',
  'SupplySourceType',
  'SupplySourceHeaderId',
  'SupplySourceHeaderNumber',
  'SupplySourceLineId'
].join(',');

const inventoryInputFields = {
  organizationId: organizationIdSchema.optional(),
  organizationCode: organizationCodeSchema.optional(),
  itemId: itemIdSchema.optional(),
  itemNumber: itemNumberSchema.optional(),
  subinventoryCode: z.string().min(1).max(10).optional().describe('Exact subinventory code.'),
  locatorId: numericIdSchema.optional().describe('Exact inventory locator ID as a string.'),
  lotNumber: z.string().min(1).max(80).optional().describe('Exact inventory lot number.')
};

type InventoryFilters = {
  organizationId?: string;
  organizationCode?: string;
  itemId?: string;
  itemNumber?: string;
  subinventoryCode?: string;
  locatorId?: string;
  lotNumber?: string;
};

const inventoryFilter = (input: InventoryFilters, fields: readonly string[]) =>
  andFilters(
    adfIdEquals('OrganizationId', input.organizationId, fields),
    input.organizationCode !== undefined
      ? adfEquals('OrganizationCode', input.organizationCode, fields)
      : undefined,
    adfIdEquals('InventoryItemId', input.itemId, fields),
    input.itemNumber !== undefined
      ? adfEquals('ItemNumber', input.itemNumber, fields)
      : undefined,
    input.subinventoryCode !== undefined
      ? adfEquals('SubinventoryCode', input.subinventoryCode, fields)
      : undefined,
    adfIdEquals('LocatorId', input.locatorId, fields),
    input.lotNumber !== undefined ? adfEquals('LotNumber', input.lotNumber, fields) : undefined
  );

const onHandSchema = z.object({
  ...resourceFields,
  onhandSummaryId: z
    .string()
    .optional()
    .describe('On-hand summary business ID, distinct from resourceKey.'),
  organizationId: z
    .string()
    .optional()
    .describe('Inventory organization ID represented as a string.'),
  organizationCode: z.string().optional().describe('Inventory organization code.'),
  itemId: z.string().optional().describe('Inventory item ID represented as a string.'),
  itemNumber: z.string().optional().describe('Inventory item number.'),
  subinventoryCode: z.string().optional().describe('Subinventory containing this stock.'),
  locatorId: z.string().optional().describe('Inventory locator ID represented as a string.'),
  locatorName: z.string().optional().describe('Inventory locator name.'),
  lotNumber: z.string().optional().describe('Inventory lot number.'),
  revision: z.string().optional().describe('Item revision, when revision controlled.'),
  quantity: z
    .number()
    .optional()
    .describe(
      'Physical on-hand quantity in primaryUomCode. This is not an available-to-promise quantity.'
    ),
  primaryUomCode: z.string().optional().describe('Primary unit of measure code for quantity.'),
  primaryUom: z.string().optional().describe('Primary unit of measure name for quantity.'),
  secondaryQuantity: z
    .number()
    .optional()
    .describe('Physical on-hand quantity in secondaryUomCode, when tracked.'),
  secondaryUomCode: z.string().optional().describe('Secondary unit of measure code.'),
  secondaryUom: z.string().optional().describe('Secondary unit of measure name.')
});

const reservationSchema = z.object({
  ...resourceFields,
  reservationId: z
    .string()
    .describe('Reservation business ID represented as a string, distinct from resourceKey.'),
  organizationId: z.string().describe('Inventory organization ID represented as a string.'),
  organizationCode: z.string().optional().describe('Inventory organization code.'),
  itemId: z.string().describe('Inventory item ID represented as a string.'),
  itemNumber: z.string().optional().describe('Inventory item number.'),
  description: z.string().optional().describe('Inventory item description.'),
  subinventoryCode: z.string().optional().describe('Subinventory used for the reservation.'),
  locatorId: z.string().optional().describe('Reservation locator ID represented as a string.'),
  locatorName: z.string().optional().describe('Reservation locator name.'),
  lotNumber: z.string().optional().describe('Reserved lot number.'),
  revision: z.string().optional().describe('Reserved item revision.'),
  reservationQuantity: z
    .number()
    .optional()
    .describe(
      'Reserved quantity expressed in primaryUomCode. The user-selected reservationUomCode is separate metadata.'
    ),
  reservationUomCode: z
    .string()
    .optional()
    .describe('Unit of measure code selected for the reservation.'),
  reservationUom: z
    .string()
    .optional()
    .describe('Unit of measure selected for the reservation.'),
  primaryReservationQuantity: z
    .number()
    .optional()
    .describe('Reserved quantity expressed in primaryUomCode.'),
  primaryUomCode: z.string().optional().describe('Item primary unit of measure code.'),
  primaryUom: z.string().optional().describe('Item primary unit of measure name.'),
  secondaryReservationQuantity: z
    .number()
    .optional()
    .describe('Reserved quantity expressed in secondaryUomCode.'),
  secondaryUomCode: z.string().optional().describe('Item secondary unit of measure code.'),
  secondaryUom: z.string().optional().describe('Item secondary unit of measure name.'),
  requirementDate: z.string().optional().describe('Date when the customer requires the item.'),
  demandSourceType: z
    .string()
    .optional()
    .describe('Type of demand document, such as Sales Order.'),
  demandSourceHeaderId: z
    .string()
    .optional()
    .describe('Demand document ID represented as a string.'),
  demandSourceHeaderNumber: z.string().optional().describe('Demand document number.'),
  demandSourceLineId: z
    .string()
    .optional()
    .describe('Demand document line ID represented as a string.'),
  demandSourceLineNumber: z.string().optional().describe('Demand document line number.'),
  sourceFulfillmentLineId: z
    .string()
    .optional()
    .describe('Order orchestration fulfillment line ID represented as a string.'),
  supplySourceType: z
    .string()
    .optional()
    .describe('Type of supply document, such as On Hand or Purchase Order.'),
  supplySourceHeaderId: z
    .string()
    .optional()
    .describe('Supply document ID represented as a string.'),
  supplySourceHeaderNumber: z.string().optional().describe('Supply document number.'),
  supplySourceLineId: z
    .string()
    .optional()
    .describe('Supply document line ID represented as a string.')
});

const mapOnHand = (
  client: OracleFusionClient,
  record: OracleRecord
): z.infer<typeof onHandSchema> => ({
  ...mapResource(client, ON_HAND_COLLECTION, record),
  onhandSummaryId: idField(record, 'OnhandSummaryId'),
  organizationId: idField(record, 'OrganizationId'),
  organizationCode: stringField(record, 'OrganizationCode'),
  itemId: idField(record, 'InventoryItemId'),
  itemNumber: stringField(record, 'ItemNumber'),
  subinventoryCode: stringField(record, 'SubinventoryCode'),
  locatorId: idField(record, 'LocatorId'),
  locatorName: stringField(record, 'LocatorName'),
  lotNumber: stringField(record, 'LotNumber'),
  revision: stringField(record, 'Revision'),
  quantity: numberField(record, 'Quantity'),
  primaryUomCode: stringField(record, 'PrimaryUOMCode'),
  primaryUom: stringField(record, 'PrimaryUOM'),
  secondaryQuantity: numberField(record, 'SecondaryUOMQuantity'),
  secondaryUomCode: stringField(record, 'SecondaryUOMCode'),
  secondaryUom: stringField(record, 'SecondaryUOM')
});

const mapReservation = (
  client: OracleFusionClient,
  record: OracleRecord
): z.infer<typeof reservationSchema> => ({
  ...mapResource(client, RESERVATIONS_COLLECTION, record),
  reservationId: requiredId(record, 'ReservationId'),
  organizationId: requiredId(record, 'OrganizationId'),
  organizationCode: stringField(record, 'OrganizationCode'),
  itemId: requiredId(record, 'InventoryItemId'),
  itemNumber: stringField(record, 'ItemNumber'),
  description: stringField(record, 'ItemDescription'),
  subinventoryCode: stringField(record, 'SubinventoryCode'),
  locatorId: idField(record, 'LocatorId'),
  locatorName: stringField(record, 'Locator'),
  lotNumber: stringField(record, 'LotNumber'),
  revision: stringField(record, 'Revision'),
  reservationQuantity: numberField(record, 'ReservationQuantity'),
  reservationUomCode: stringField(record, 'ReservationUOMCode'),
  reservationUom: stringField(record, 'ReservationUnitOfMeasure'),
  primaryReservationQuantity: numberField(record, 'PrimaryReservationQuantity'),
  primaryUomCode: stringField(record, 'PrimaryUOMCode'),
  primaryUom: stringField(record, 'PrimaryUnitOfMeasure'),
  secondaryReservationQuantity: numberField(record, 'SecondaryReservationQuantity'),
  secondaryUomCode: stringField(record, 'SecondaryUOMCode'),
  secondaryUom: stringField(record, 'SecondaryUnitOfMeasure'),
  requirementDate: stringField(record, 'RequirementDate'),
  demandSourceType: stringField(record, 'DemandSourceType'),
  demandSourceHeaderId: idField(record, 'DemandSourceHeaderId'),
  demandSourceHeaderNumber: stringField(record, 'DemandSourceHeaderNumber'),
  demandSourceLineId: idField(record, 'DemandSourceLineId'),
  demandSourceLineNumber: stringField(record, 'DemandSourceLineNumber'),
  sourceFulfillmentLineId: idField(record, 'SourceFulfillmentLineId'),
  supplySourceType: stringField(record, 'SupplySourceType'),
  supplySourceHeaderId: idField(record, 'SupplySourceHeaderId'),
  supplySourceHeaderNumber: stringField(record, 'SupplySourceHeaderNumber'),
  supplySourceLineId: idField(record, 'SupplySourceLineId')
});

export const listOnHandQuantities = SlateTool.create(spec, {
  key: 'list_on_hand_quantities',
  name: 'List On-Hand Quantities',
  description:
    'List physical inventory on-hand quantity summaries by organization, item, subinventory, locator, and lot, with primary and secondary units of measure. These quantities are physical stock, not available-to-promise availability. Call list_inventory_organizations and list_items to discover organization and item IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ ...paginationInputFields, ...inventoryInputFields }))
  .output(z.object({ items: z.array(onHandSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('fscm', ON_HAND_COLLECTION, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q: inventoryFilter(ctx.input, INVENTORY_FILTER_FIELDS),
      orderBy: 'OnhandSummaryId:asc',
      fields: ON_HAND_FIELDS,
      links: 'self'
    });
    return {
      output: { ...page, items: page.items.map(record => mapOnHand(client, record)) },
      message: `Found ${page.count} on-hand quantity summaries.`
    };
  })
  .build();

export const listInventoryReservations = SlateTool.create(spec, {
  key: 'list_inventory_reservations',
  name: 'List Inventory Reservations',
  description:
    'List inventory reservations with quantities, units of measure, inventory locations, and the demand and supply documents they connect. Reservations are separate from physical on-hand quantity summaries. Call list_inventory_organizations and list_items to discover organization and item IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      ...inventoryInputFields,
      reservationId: numericIdSchema
        .optional()
        .describe('Exact reservation ID represented as a string.'),
      demandSourceHeaderNumber: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe('Exact demand document number, such as a sales order number.'),
      demandSourceType: z
        .string()
        .min(1)
        .max(80)
        .optional()
        .describe('Exact demand document type, such as Sales Order.')
    })
  )
  .output(z.object({ items: z.array(reservationSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('fscm', RESERVATIONS_COLLECTION, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q: andFilters(
        inventoryFilter(ctx.input, RESERVATION_FILTER_FIELDS),
        adfIdEquals('ReservationId', ctx.input.reservationId, RESERVATION_FILTER_FIELDS),
        ctx.input.demandSourceHeaderNumber !== undefined
          ? adfEquals(
              'DemandSourceHeaderNumber',
              ctx.input.demandSourceHeaderNumber,
              RESERVATION_FILTER_FIELDS
            )
          : undefined,
        ctx.input.demandSourceType !== undefined
          ? adfEquals(
              'DemandSourceType',
              ctx.input.demandSourceType,
              RESERVATION_FILTER_FIELDS
            )
          : undefined
      ),
      orderBy: 'ReservationId:asc',
      fields: RESERVATION_FIELDS,
      links: 'self'
    });
    return {
      output: { ...page, items: page.items.map(record => mapReservation(client, record)) },
      message: `Found ${page.count} inventory reservations.`
    };
  })
  .build();
