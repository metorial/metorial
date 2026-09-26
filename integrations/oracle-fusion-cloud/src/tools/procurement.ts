import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { type OracleCollectionPath, OracleFusionClient } from '../lib/client';
import { adfContains, adfEquals, adfIdEquals, andFilters } from '../lib/filters';
import {
  booleanField,
  idField,
  numberField,
  type OracleRecord,
  stringField
} from '../lib/records';
import { pageOutputFields, paginationInputFields, resourceKeySchema } from '../lib/schemas';
import { spec } from '../spec';

const SUPPLIER_FIELDS = [
  'SupplierId',
  'SupplierNumber',
  'Supplier',
  'Status',
  'InactiveDate',
  'BusinessRelationship',
  'BusinessRelationshipCode',
  'SupplierType',
  'SupplierTypeCode',
  'CreationDate',
  'LastUpdateDate'
].join(',');
const SUPPLIER_FILTER_FIELDS = [
  'SupplierNumber',
  'Supplier',
  'BusinessRelationshipCode'
] as const;
const SITE_FIELDS = [
  'SupplierSiteId',
  'SupplierSite',
  'ProcurementBUId',
  'ProcurementBU',
  'Status',
  'InactiveDate',
  'SitePurposePayFlag',
  'SitePurposePrimaryPayFlag',
  'SitePurposePurchasingFlag',
  'SupplierAddressId',
  'SupplierAddressName',
  'InvoiceCurrencyCode'
].join(',');
const SITE_FILTER_FIELDS = [
  'SupplierSite',
  'Status',
  'ProcurementBU',
  'ProcurementBUId',
  'SitePurposePayFlag'
] as const;
const PURCHASE_ORDER_FIELDS = [
  'POHeaderId',
  'OrderNumber',
  'Status',
  'StatusCode',
  'SupplierId',
  'Supplier',
  'SupplierSiteId',
  'SupplierSite',
  'ProcurementBUId',
  'ProcurementBU',
  'BillToBUId',
  'BillToBU',
  'SoldToLegalEntityId',
  'SoldToLegalEntity',
  'CurrencyCode',
  'Ordered',
  'Total',
  'Description',
  'CreationDate',
  'LastUpdateDate'
].join(',');
const PURCHASE_ORDER_FILTER_FIELDS = [
  'OrderNumber',
  'Supplier',
  'SupplierId',
  'Status',
  'StatusCode',
  'ProcurementBU',
  'ProcurementBUId'
] as const;

let requireIdentifier = (record: OracleRecord, field: string): string => {
  let value = idField(record, field);
  if (!value) {
    throw createApiServiceError(
      `Oracle Fusion did not return the required ${field} identifier.`,
      {
        reason: 'oracle_fusion_invalid_response'
      }
    );
  }
  return value;
};

let supplierSchema = z.object({
  resourceKey: resourceKeySchema.describe(
    'Oracle supplier resource key discovered from its self link. Pass this to get_supplier or list_supplier_sites; it can differ from supplierId or supplierNumber.'
  ),
  supplierId: z
    .string()
    .describe(
      'Stable Oracle SupplierId as a string. This business identifier is distinct from the resourceKey used to read the supplier.'
    ),
  supplierNumber: z
    .string()
    .optional()
    .describe(
      'Supplier number used by the business and accepted by the supplierNumber filter.'
    ),
  supplierName: z
    .string()
    .optional()
    .describe(
      'Oracle supplier name. Use this value when an invoice requires a supplier name.'
    ),
  status: z
    .string()
    .optional()
    .describe(
      'Supplier status returned by Oracle, such as ACTIVE or INACTIVE. Oracle does not support filtering suppliers by this field.'
    ),
  inactiveDate: z
    .string()
    .optional()
    .describe('Date after which the supplier is inactive, when configured.'),
  businessRelationship: z
    .string()
    .optional()
    .describe('Display name of the enterprise relationship with the supplier.'),
  businessRelationshipCode: z
    .string()
    .optional()
    .describe(
      'Oracle code for the supplier business relationship, such as SPEND_AUTHORIZED or PROSPECTIVE.'
    ),
  supplierType: z.string().optional().describe('Display name of the supplier type.'),
  supplierTypeCode: z
    .string()
    .optional()
    .describe('Oracle code identifying the supplier type.'),
  createdAt: z.string().optional().describe('Oracle supplier creation timestamp.'),
  updatedAt: z.string().optional().describe('Oracle supplier last update timestamp.')
});

let supplierSiteSchema = z.object({
  resourceKey: resourceKeySchema.describe(
    'Oracle supplier site resource key discovered from the site self link.'
  ),
  supplierSiteId: z
    .string()
    .describe('Stable Oracle SupplierSiteId as a string, distinct from the site resourceKey.'),
  supplierSite: z
    .string()
    .optional()
    .describe(
      'Oracle SupplierSite name or site code. Pass this value as supplierSite when creating an invoice for the supplier.'
    ),
  procurementBusinessUnitId: z
    .string()
    .optional()
    .describe(
      'Stable Oracle ProcurementBUId identifying the business unit where this site resides.'
    ),
  procurementBusinessUnit: z
    .string()
    .optional()
    .describe('Procurement business unit name for this site.'),
  status: z
    .string()
    .optional()
    .describe('Supplier site status returned by Oracle, such as ACTIVE or INACTIVE.'),
  inactiveDate: z
    .string()
    .optional()
    .describe('Date after which the supplier site is inactive, when configured.'),
  paySite: z
    .boolean()
    .optional()
    .describe('Whether the supplier site is enabled for payment.'),
  primaryPaySite: z
    .boolean()
    .optional()
    .describe('Whether the supplier site is the primary payment site.'),
  purchasingSite: z
    .boolean()
    .optional()
    .describe('Whether the supplier site is enabled for purchasing.'),
  supplierAddressId: z
    .string()
    .optional()
    .describe('Stable Oracle identifier of the supplier address associated with the site.'),
  supplierAddressName: z
    .string()
    .optional()
    .describe('Name of the supplier address associated with the site.'),
  invoiceCurrencyCode: z
    .string()
    .optional()
    .describe('Default invoice currency code configured for this supplier site, when present.')
});

let purchaseOrderSchema = z.object({
  resourceKey: resourceKeySchema.describe(
    'Opaque purchaseOrdersUniqID discovered from the purchase order self link. Pass this exact value to get_purchase_order; do not construct it from purchaseOrderId or orderNumber.'
  ),
  purchaseOrderId: z
    .string()
    .describe(
      'Stable Oracle POHeaderId as a string. This business identifier is distinct from the opaque resourceKey.'
    ),
  orderNumber: z
    .string()
    .optional()
    .describe(
      'Purchase order number, unique within the sold-to legal entity rather than necessarily across the tenant.'
    ),
  status: z
    .string()
    .optional()
    .describe(
      'Display name of the purchase order lifecycle status, such as Open or Incomplete.'
    ),
  statusCode: z
    .string()
    .optional()
    .describe('Oracle purchase order lifecycle status code, such as OPEN or INCOMPLETE.'),
  supplierId: z
    .string()
    .optional()
    .describe('Stable Oracle identifier of the supplier fulfilling the purchase order.'),
  supplierName: z
    .string()
    .optional()
    .describe('Name of the supplier fulfilling the purchase order.'),
  supplierSiteId: z
    .string()
    .optional()
    .describe('Stable Oracle identifier of the supplier site for the purchase order.'),
  supplierSite: z
    .string()
    .optional()
    .describe('Supplier site name or code for the purchase order.'),
  procurementBusinessUnitId: z
    .string()
    .optional()
    .describe(
      'Stable Oracle identifier of the business unit that manages the purchase order.'
    ),
  procurementBusinessUnit: z
    .string()
    .optional()
    .describe('Name of the business unit that manages the purchase order.'),
  billToBusinessUnitId: z
    .string()
    .optional()
    .describe(
      'Stable Oracle identifier of the business unit that processes invoices for the purchase order.'
    ),
  billToBusinessUnit: z
    .string()
    .optional()
    .describe('Name of the business unit that processes invoices for the purchase order.'),
  soldToLegalEntityId: z
    .string()
    .optional()
    .describe(
      'Stable Oracle identifier of the legal entity financially responsible for the purchase order.'
    ),
  soldToLegalEntity: z
    .string()
    .optional()
    .describe('Name of the legal entity financially responsible for the purchase order.'),
  currencyCode: z
    .string()
    .optional()
    .describe('Currency code for the purchase order amounts.'),
  orderedAmount: z
    .number()
    .optional()
    .describe('Total ordered amount across purchase order lines, excluding exclusive taxes.'),
  totalAmount: z
    .number()
    .optional()
    .describe('Ordered amount plus exclusive taxes for the purchase order.'),
  description: z.string().optional().describe('Purchase order header description.'),
  createdAt: z.string().optional().describe('Oracle purchase order creation timestamp.'),
  updatedAt: z.string().optional().describe('Oracle purchase order last update timestamp.')
});

let mapSupplier = (
  client: OracleFusionClient,
  record: OracleRecord
): z.infer<typeof supplierSchema> => ({
  resourceKey: client.resourceKey(record, 'fscm', '/suppliers'),
  supplierId: requireIdentifier(record, 'SupplierId'),
  supplierNumber: stringField(record, 'SupplierNumber'),
  supplierName: stringField(record, 'Supplier'),
  status: stringField(record, 'Status'),
  inactiveDate: stringField(record, 'InactiveDate'),
  businessRelationship: stringField(record, 'BusinessRelationship'),
  businessRelationshipCode: stringField(record, 'BusinessRelationshipCode'),
  supplierType: stringField(record, 'SupplierType'),
  supplierTypeCode: stringField(record, 'SupplierTypeCode'),
  createdAt: stringField(record, 'CreationDate'),
  updatedAt: stringField(record, 'LastUpdateDate')
});

let mapSupplierSite = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  record: OracleRecord
): z.infer<typeof supplierSiteSchema> => ({
  resourceKey: client.resourceKey(record, 'fscm', collection),
  supplierSiteId: requireIdentifier(record, 'SupplierSiteId'),
  supplierSite: stringField(record, 'SupplierSite'),
  procurementBusinessUnitId: idField(record, 'ProcurementBUId'),
  procurementBusinessUnit: stringField(record, 'ProcurementBU'),
  status: stringField(record, 'Status'),
  inactiveDate: stringField(record, 'InactiveDate'),
  paySite: booleanField(record, 'SitePurposePayFlag'),
  primaryPaySite: booleanField(record, 'SitePurposePrimaryPayFlag'),
  purchasingSite: booleanField(record, 'SitePurposePurchasingFlag'),
  supplierAddressId: idField(record, 'SupplierAddressId'),
  supplierAddressName: stringField(record, 'SupplierAddressName'),
  invoiceCurrencyCode: stringField(record, 'InvoiceCurrencyCode')
});

let mapPurchaseOrder = (
  client: OracleFusionClient,
  record: OracleRecord
): z.infer<typeof purchaseOrderSchema> => ({
  resourceKey: client.resourceKey(record, 'fscm', '/purchaseOrders'),
  purchaseOrderId: requireIdentifier(record, 'POHeaderId'),
  orderNumber: stringField(record, 'OrderNumber'),
  status: stringField(record, 'Status'),
  statusCode: stringField(record, 'StatusCode'),
  supplierId: idField(record, 'SupplierId'),
  supplierName: stringField(record, 'Supplier'),
  supplierSiteId: idField(record, 'SupplierSiteId'),
  supplierSite: stringField(record, 'SupplierSite'),
  procurementBusinessUnitId: idField(record, 'ProcurementBUId'),
  procurementBusinessUnit: stringField(record, 'ProcurementBU'),
  billToBusinessUnitId: idField(record, 'BillToBUId'),
  billToBusinessUnit: stringField(record, 'BillToBU'),
  soldToLegalEntityId: idField(record, 'SoldToLegalEntityId'),
  soldToLegalEntity: stringField(record, 'SoldToLegalEntity'),
  currencyCode: stringField(record, 'CurrencyCode'),
  orderedAmount: numberField(record, 'Ordered'),
  totalAmount: numberField(record, 'Total'),
  description: stringField(record, 'Description'),
  createdAt: stringField(record, 'CreationDate'),
  updatedAt: stringField(record, 'LastUpdateDate')
});

export let listSuppliers = SlateTool.create(spec, {
  name: 'List Suppliers',
  key: 'list_suppliers',
  description:
    'Find Oracle Fusion suppliers by number, name, or business relationship and discover the resource keys needed to read suppliers and their sites.',
  instructions: [
    'Use each returned resourceKey as supplierKey for get_supplier and list_supplier_sites. Supplier status is returned for inspection but is not a queryable supplier filter. Filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      supplierNumber: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe('Exact Oracle supplier number to match.'),
      supplierName: z
        .string()
        .min(1)
        .max(360)
        .optional()
        .describe('Exact Oracle supplier name to match.'),
      supplierNameContains: z
        .string()
        .min(1)
        .max(360)
        .optional()
        .describe(
          'Literal text to find within Oracle supplier names. Percent, underscore, asterisk, and backslash characters are not supported; use supplierName for exact matches containing them.'
        ),
      businessRelationshipCode: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe(
          'Exact Oracle business relationship code to match, such as SPEND_AUTHORIZED or PROSPECTIVE.'
        )
    })
  )
  .output(
    z.object({
      items: z.array(supplierSchema).describe('Supplier summaries for this page.'),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let q = andFilters(
      ctx.input.supplierNumber === undefined
        ? undefined
        : adfEquals('SupplierNumber', ctx.input.supplierNumber, SUPPLIER_FILTER_FIELDS),
      ctx.input.supplierName === undefined
        ? undefined
        : adfEquals('Supplier', ctx.input.supplierName, SUPPLIER_FILTER_FIELDS),
      ctx.input.supplierNameContains === undefined
        ? undefined
        : adfContains('Supplier', ctx.input.supplierNameContains, SUPPLIER_FILTER_FIELDS),
      ctx.input.businessRelationshipCode === undefined
        ? undefined
        : adfEquals(
            'BusinessRelationshipCode',
            ctx.input.businessRelationshipCode,
            SUPPLIER_FILTER_FIELDS
          )
    );
    let page = await client.list('fscm', '/suppliers', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q,
      fields: SUPPLIER_FIELDS,
      links: 'self'
    });
    return {
      output: { ...page, items: page.items.map(record => mapSupplier(client, record)) },
      message: `Found ${page.count} supplier${page.count === 1 ? '' : 's'} in this page.`
    };
  })
  .build();

export let getSupplier = SlateTool.create(spec, {
  name: 'Get Supplier',
  key: 'get_supplier',
  description:
    'Read a discovered Oracle Fusion supplier and return its business identifier, number, name, relationship, and status.',
  instructions: [
    'Discover supplierKey from list_suppliers resourceKey. Do not substitute supplierNumber or construct a key from supplierId.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      supplierKey: resourceKeySchema.describe(
        'Supplier resourceKey returned by list_suppliers or get_supplier. This is distinct from the supplier business number and may differ from supplierId.'
      )
    })
  )
  .output(supplierSchema)
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let record = await client.get('fscm', '/suppliers', ctx.input.supplierKey, {
      fields: SUPPLIER_FIELDS,
      links: 'self'
    });
    return { output: mapSupplier(client, record), message: 'Retrieved supplier details.' };
  })
  .build();

export let listSupplierSites = SlateTool.create(spec, {
  name: 'List Supplier Sites',
  key: 'list_supplier_sites',
  description:
    'List an Oracle Fusion supplier’s sites, including names or codes, business units, payment eligibility, and statuses for invoice and purchasing workflows.',
  instructions: [
    'Discover supplierKey from list_suppliers. Select an active site with paySite true when preparing an invoice, and use the returned supplierSite value as its supplier site name. A payment flag alone does not establish that a site is available to every invoice business unit. Filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      supplierKey: resourceKeySchema.describe(
        'Supplier resourceKey discovered by list_suppliers or get_supplier. Do not substitute a supplier number.'
      ),
      ...paginationInputFields,
      supplierSite: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe('Exact Oracle supplier site name or site code to match.'),
      status: z
        .string()
        .min(1)
        .max(10)
        .optional()
        .describe('Exact Oracle supplier site status to match, such as ACTIVE or INACTIVE.'),
      procurementBusinessUnit: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe(
          'Exact name of the procurement business unit where the supplier site resides.'
        ),
      procurementBusinessUnitId: z
        .string()
        .regex(/^[0-9]+$/)
        .optional()
        .describe(
          'Exact numeric Oracle procurement business unit ID, represented as a string. Discover IDs with list_business_units or a previous site result.'
        ),
      paySite: z
        .boolean()
        .optional()
        .describe('Filter sites by whether they are enabled for payment.')
    })
  )
  .output(
    z.object({
      items: z.array(supplierSiteSchema).describe('Supplier site summaries for this page.'),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let collection = client.childCollectionPath('/suppliers', ctx.input.supplierKey, 'sites');
    let q = andFilters(
      ctx.input.supplierSite === undefined
        ? undefined
        : adfEquals('SupplierSite', ctx.input.supplierSite, SITE_FILTER_FIELDS),
      ctx.input.status === undefined
        ? undefined
        : adfEquals('Status', ctx.input.status, SITE_FILTER_FIELDS),
      ctx.input.procurementBusinessUnit === undefined
        ? undefined
        : adfEquals('ProcurementBU', ctx.input.procurementBusinessUnit, SITE_FILTER_FIELDS),
      adfIdEquals('ProcurementBUId', ctx.input.procurementBusinessUnitId, SITE_FILTER_FIELDS),
      ctx.input.paySite === undefined
        ? undefined
        : adfEquals('SitePurposePayFlag', ctx.input.paySite, SITE_FILTER_FIELDS)
    );
    let page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q,
      fields: SITE_FIELDS,
      links: 'self'
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => mapSupplierSite(client, collection, record))
      },
      message: `Found ${page.count} supplier site${page.count === 1 ? '' : 's'} in this page.`
    };
  })
  .build();

export let listPurchaseOrders = SlateTool.create(spec, {
  name: 'List Purchase Orders',
  key: 'list_purchase_orders',
  description:
    'Find Oracle Fusion purchase order headers by order number, supplier, lifecycle status, or procurement business unit and discover opaque keys for follow-up reads.',
  instructions: [
    'Use each returned resourceKey as purchaseOrderKey for get_purchase_order. Order numbers may repeat across sold-to legal entities; inspect the returned entity and business unit. Returns headers only, without purchase order lines. Filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      orderNumber: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe(
          'Exact Oracle purchase order number to match. Multiple legal entities may use the same number.'
        ),
      supplierName: z
        .string()
        .min(1)
        .max(360)
        .optional()
        .describe(
          'Exact supplier name to match. Discover supplier names with list_suppliers.'
        ),
      supplierId: z
        .string()
        .regex(/^[0-9]+$/)
        .optional()
        .describe(
          'Exact numeric Oracle SupplierId, represented as a string. Discover supplierId with list_suppliers; this is not the supplier resourceKey.'
        ),
      status: z
        .string()
        .min(1)
        .max(80)
        .optional()
        .describe(
          'Exact display name of the purchase order lifecycle status, such as Open or Incomplete.'
        ),
      statusCode: z
        .string()
        .min(1)
        .max(25)
        .optional()
        .describe(
          'Exact Oracle purchase order lifecycle status code, such as OPEN or INCOMPLETE.'
        ),
      procurementBusinessUnit: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe('Exact procurement business unit name to match.'),
      procurementBusinessUnitId: z
        .string()
        .regex(/^[0-9]+$/)
        .optional()
        .describe(
          'Exact numeric Oracle procurement business unit ID, represented as a string. Discover IDs with list_business_units or a previous purchase order result.'
        )
    })
  )
  .output(
    z.object({
      items: z
        .array(purchaseOrderSchema)
        .describe(
          'Purchase order header summaries for this page; line details are not included.'
        ),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let q = andFilters(
      ctx.input.orderNumber === undefined
        ? undefined
        : adfEquals('OrderNumber', ctx.input.orderNumber, PURCHASE_ORDER_FILTER_FIELDS),
      ctx.input.supplierName === undefined
        ? undefined
        : adfEquals('Supplier', ctx.input.supplierName, PURCHASE_ORDER_FILTER_FIELDS),
      adfIdEquals('SupplierId', ctx.input.supplierId, PURCHASE_ORDER_FILTER_FIELDS),
      ctx.input.status === undefined
        ? undefined
        : adfEquals('Status', ctx.input.status, PURCHASE_ORDER_FILTER_FIELDS),
      ctx.input.statusCode === undefined
        ? undefined
        : adfEquals('StatusCode', ctx.input.statusCode, PURCHASE_ORDER_FILTER_FIELDS),
      ctx.input.procurementBusinessUnit === undefined
        ? undefined
        : adfEquals(
            'ProcurementBU',
            ctx.input.procurementBusinessUnit,
            PURCHASE_ORDER_FILTER_FIELDS
          ),
      adfIdEquals(
        'ProcurementBUId',
        ctx.input.procurementBusinessUnitId,
        PURCHASE_ORDER_FILTER_FIELDS
      )
    );
    let page = await client.list('fscm', '/purchaseOrders', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q,
      fields: PURCHASE_ORDER_FIELDS,
      links: 'self'
    });
    return {
      output: { ...page, items: page.items.map(record => mapPurchaseOrder(client, record)) },
      message: `Found ${page.count} purchase order${page.count === 1 ? '' : 's'} in this page.`
    };
  })
  .build();

export let getPurchaseOrder = SlateTool.create(spec, {
  name: 'Get Purchase Order',
  key: 'get_purchase_order',
  description:
    'Read a discovered Oracle Fusion purchase order header, including its supplier, business units, lifecycle status, currency, and amounts.',
  instructions: [
    'Discover purchaseOrderKey from list_purchase_orders resourceKey. Oracle uses an opaque composite key; do not construct it from purchaseOrderId or orderNumber. Returns header fields only without expanding lines.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      purchaseOrderKey: resourceKeySchema.describe(
        'Exact opaque resourceKey returned by list_purchase_orders or get_purchase_order. This purchaseOrdersUniqID differs from the numeric purchaseOrderId and orderNumber.'
      )
    })
  )
  .output(purchaseOrderSchema)
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let record = await client.get('fscm', '/purchaseOrders', ctx.input.purchaseOrderKey, {
      fields: PURCHASE_ORDER_FIELDS,
      links: 'self'
    });
    return {
      output: mapPurchaseOrder(client, record),
      message: 'Retrieved purchase order header.'
    };
  })
  .build();

export let procurementTools = {
  list_suppliers: listSuppliers,
  get_supplier: getSupplier,
  list_supplier_sites: listSupplierSites,
  list_purchase_orders: listPurchaseOrders,
  get_purchase_order: getPurchaseOrder
};
