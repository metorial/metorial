import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { OracleFusionClient } from '../lib/client';
import { adfEquals, adfIdEquals, andFilters } from '../lib/filters';
import { booleanField, idField, type OracleRecord, stringField } from '../lib/records';
import { pageOutputFields, paginationInputFields, resourceKeySchema } from '../lib/schemas';
import { spec } from '../spec';
import { listInventoryReservations, listOnHandQuantities } from './scm/inventory';
import { listReceivingTransactions } from './scm/receiving';
import { getSalesOrder, listSalesOrderLines, listSalesOrders } from './scm/sales';

const ORGANIZATION_FILTER_FIELDS = [
  'OrganizationId',
  'OrganizationName',
  'OrganizationCode'
] as const;
const ITEM_FILTER_FIELDS = ['OrganizationId', 'OrganizationCode', 'ItemNumber'] as const;
const ORGANIZATION_FIELDS =
  'OrganizationId,OrganizationName,OrganizationCode,Status,InventoryFlag';
const ITEM_FIELDS =
  'ItemId,OrganizationId,OrganizationCode,ItemNumber,ItemDescription,ItemStatusValue,PrimaryUOMValue';

let organizationIdSchema = z
  .string()
  .regex(/^\d+$/)
  .max(18)
  .describe(
    'Numeric organization ID represented as a string. Call list_inventory_organizations to discover authorized organization IDs.'
  );
let organizationCodeSchema = z
  .string()
  .min(1)
  .max(18)
  .describe(
    'Exact organization code. Call list_inventory_organizations to discover authorized organization codes.'
  );

let organizationSchema = z.object({
  organizationId: z
    .string()
    .min(1)
    .describe(
      'Stable inventory or item organization ID represented as a string. Pass it to list_items to select this organization.'
    ),
  name: z.string().min(1).describe('Human-readable inventory or item organization name.'),
  code: z
    .string()
    .min(1)
    .describe('Organization code. Pass it to list_items to select this organization.'),
  status: z
    .string()
    .optional()
    .describe('Organization status indicating whether the organization is active.'),
  inventoryEnabled: z
    .boolean()
    .optional()
    .describe(
      'Whether this is an inventory organization; false identifies an item organization.'
    )
});

let itemSchema = z.object({
  resourceKey: resourceKeySchema.describe(
    'Opaque composite item key obtained from Oracle. Pass this value as itemKey to get_item; it differs from itemId and organizationId.'
  ),
  itemId: z
    .string()
    .min(1)
    .describe(
      'Stable item ID represented as a string. The item belongs to the organization identified by organizationId.'
    ),
  organizationId: z
    .string()
    .min(1)
    .describe(
      'Organization ID represented as a string. Use list_inventory_organizations to find the corresponding name and code.'
    ),
  organizationCode: z
    .string()
    .optional()
    .describe('Code identifying the organization to which the item belongs.'),
  itemNumber: z
    .string()
    .optional()
    .describe('Name or number of the part, item, product, or service.'),
  description: z
    .string()
    .optional()
    .describe('Description of the part, item, product, or service.'),
  status: z
    .string()
    .optional()
    .describe('Item status governing its permitted transaction activity.'),
  primaryUom: z
    .string()
    .optional()
    .describe('Primary unit of measure of the item, such as Each.')
});

let requiredId = (record: OracleRecord, key: string): string => {
  let value = idField(record, key);
  if (!value) {
    throw createApiServiceError(
      `Oracle Fusion did not return the required ${key} identifier.`,
      { reason: 'oracle_fusion_invalid_response' }
    );
  }
  return value;
};

let requiredString = (record: OracleRecord, key: string): string => {
  let value = stringField(record, key);
  if (!value) {
    throw createApiServiceError(`Oracle Fusion did not return the required ${key} value.`, {
      reason: 'oracle_fusion_invalid_response'
    });
  }
  return value;
};

let mapOrganization = (record: OracleRecord): z.infer<typeof organizationSchema> => ({
  organizationId: requiredId(record, 'OrganizationId'),
  name: requiredString(record, 'OrganizationName'),
  code: requiredString(record, 'OrganizationCode'),
  status: stringField(record, 'Status'),
  inventoryEnabled: booleanField(record, 'InventoryFlag')
});

let mapItem = (
  client: OracleFusionClient,
  record: OracleRecord
): z.infer<typeof itemSchema> => ({
  resourceKey: client.resourceKey(record, 'fscm', '/itemsV2'),
  itemId: requiredId(record, 'ItemId'),
  organizationId: requiredId(record, 'OrganizationId'),
  organizationCode: stringField(record, 'OrganizationCode'),
  itemNumber: stringField(record, 'ItemNumber'),
  description: stringField(record, 'ItemDescription'),
  status: stringField(record, 'ItemStatusValue'),
  primaryUom: stringField(record, 'PrimaryUOMValue')
});

export let listInventoryOrganizations = SlateTool.create(spec, {
  key: 'list_inventory_organizations',
  name: 'List Inventory Organizations',
  description:
    'Discover authorized inventory and item organizations, including stable IDs, names, and codes. Pass an organization ID or code to list_items to select its item catalog.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      organizationId: organizationIdSchema.optional(),
      organizationName: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe('Exact organization name to match.'),
      organizationCode: organizationCodeSchema.optional()
    })
  )
  .output(
    z.object({
      items: z
        .array(organizationSchema)
        .describe('Inventory and item organizations accessible to the authenticated user.'),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('fscm', '/inventoryOrganizations', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q: andFilters(
        adfIdEquals('OrganizationId', ctx.input.organizationId, ORGANIZATION_FILTER_FIELDS),
        ctx.input.organizationName !== undefined
          ? adfEquals(
              'OrganizationName',
              ctx.input.organizationName,
              ORGANIZATION_FILTER_FIELDS
            )
          : undefined,
        ctx.input.organizationCode !== undefined
          ? adfEquals(
              'OrganizationCode',
              ctx.input.organizationCode,
              ORGANIZATION_FILTER_FIELDS
            )
          : undefined
      ),
      orderBy: 'OrganizationId:asc',
      fields: ORGANIZATION_FIELDS,
      links: 'self'
    });
    return {
      output: { ...page, items: page.items.map(mapOrganization) },
      message: `Found ${page.count} inventory and item organizations.`
    };
  })
  .build();

export let listItems = SlateTool.create(spec, {
  key: 'list_items',
  name: 'List Items',
  description:
    'List item catalog records with item numbers, descriptions, statuses, organization IDs, and primary units of measure. Call list_inventory_organizations to discover organization IDs and codes, then filter by the selected organization.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      organizationId: organizationIdSchema.optional(),
      organizationCode: organizationCodeSchema.optional(),
      itemNumber: z
        .string()
        .min(1)
        .max(300)
        .optional()
        .describe('Exact item number to match within the accessible item catalog.')
    })
  )
  .output(
    z.object({
      items: z
        .array(itemSchema)
        .describe('Item catalog records accessible to the authenticated user.'),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('fscm', '/itemsV2', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q: andFilters(
        adfIdEquals('OrganizationId', ctx.input.organizationId, ITEM_FILTER_FIELDS),
        ctx.input.organizationCode !== undefined
          ? adfEquals('OrganizationCode', ctx.input.organizationCode, ITEM_FILTER_FIELDS)
          : undefined,
        ctx.input.itemNumber !== undefined
          ? adfEquals('ItemNumber', ctx.input.itemNumber, ITEM_FILTER_FIELDS)
          : undefined
      ),
      orderBy: 'OrganizationId:asc,ItemId:asc',
      fields: ITEM_FIELDS,
      links: 'self'
    });
    return {
      output: { ...page, items: page.items.map(record => mapItem(client, record)) },
      message: `Found ${page.count} items.`
    };
  })
  .build();

export let getItem = SlateTool.create(spec, {
  key: 'get_item',
  name: 'Get Item',
  description:
    'Retrieve one item catalog record using its opaque composite resource key. Call list_items to obtain resourceKey and pass it as itemKey.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      itemKey: resourceKeySchema.describe(
        'Opaque resourceKey returned by list_items or get_item. Use this exact value; an item ID, organization ID, or item number is not the resource key.'
      )
    })
  )
  .output(itemSchema)
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let record = await client.get('fscm', '/itemsV2', ctx.input.itemKey, {
      fields: ITEM_FIELDS,
      links: 'self'
    });
    return { output: mapItem(client, record), message: 'Retrieved the item catalog record.' };
  })
  .build();

export let scmTools = {
  list_inventory_organizations: listInventoryOrganizations,
  list_items: listItems,
  get_item: getItem,
  list_on_hand_quantities: listOnHandQuantities,
  list_inventory_reservations: listInventoryReservations,
  list_sales_orders: listSalesOrders,
  get_sales_order: getSalesOrder,
  list_sales_order_lines: listSalesOrderLines,
  list_receiving_transactions: listReceivingTransactions
};
