import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { type OracleCollectionPath, OracleFusionClient } from '../../lib/client';
import { oracleDateSchema, validateOracleDate } from '../../lib/dates';
import { adfEquals, adfIdEquals, andFilters } from '../../lib/filters';
import { pageOutputFields, paginationInputFields, resourceKeySchema } from '../../lib/schemas';
import { spec } from '../../spec';
import {
  assertParent,
  descriptionInput,
  draftOrderFields,
  draftOrderLineFields,
  draftOrderSchema,
  mapDraftOrder,
  mapOrderLine,
  mapRequisition,
  mapRequisitionLine,
  mapSchedule,
  numericId,
  orderLineFields,
  orderLineSchema,
  orderScheduleFields,
  orderScheduleSchema,
  requireId,
  requisitionFields,
  requisitionLineFields,
  requisitionLineSchema,
  requisitionSchema
} from './models';

const requisitionFilterFields = [
  'Description',
  'Requisition',
  'DocumentStatusCode',
  'RequisitioningBUId'
] as const;
const draftOrderFilterFields = [
  'Description',
  'OrderNumber',
  'StatusCode',
  'ProcurementBUId',
  'RequisitioningBUId',
  'BillToBUId'
] as const;
const lineFilterFields = ['LineNumber'] as const;
const scheduleFilterFields = [
  'ScheduleNumber',
  'StatusCode',
  'RequestedDeliveryDate'
] as const;
const lineNumberInput = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER)
  .optional()
  .describe('Exact business line number to match within the requested document.');
const purchaseOrderResourceKeyInput = resourceKeySchema.describe(
  'Opaque purchase order resourceKey returned by list_purchase_orders or get_purchase_order. Do not substitute its purchaseOrderId or orderNumber.'
);
const requisitionResourceKeyInput = resourceKeySchema.describe(
  'Opaque requisition resourceKey returned by list_purchase_requisitions or get_purchase_requisition. Do not substitute its requisitionId or requisitionNumber.'
);
const draftPurchaseOrderResourceKeyInput = resourceKeySchema.describe(
  'Opaque draft purchase order resourceKey returned by list_draft_purchase_orders, get_draft_purchase_order, or create_draft_purchase_order. Do not substitute its purchaseOrderId or orderNumber.'
);

const readParentIdentity = async (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  resourceKey: string,
  idField: string
) => {
  const parent = await client.get('fscm', collection, resourceKey, {
    fields: idField,
    links: 'self'
  });
  const parentResourceKey = client.resourceKey(parent, 'fscm', collection);
  if (parentResourceKey !== resourceKey) {
    throw createApiServiceError(
      'Oracle Fusion returned a different parent resource than requested.',
      { reason: 'oracle_fusion_parent_mismatch' }
    );
  }
  return { parentResourceKey, parentId: requireId(parent, idField) };
};

export const listPurchaseOrderLines = SlateTool.create(spec, {
  name: 'List Purchase Order Lines',
  key: 'list_purchase_order_lines',
  description:
    'List lines within a discovered Oracle Fusion purchase order, including catalog item, quantity, price, and opaque keys for schedule reads.',
  instructions: [
    'Discover purchaseOrderResourceKey with list_purchase_orders. Use each returned line resourceKey as lineResourceKey for list_purchase_order_schedules with the same purchaseOrderResourceKey. Filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      purchaseOrderResourceKey: purchaseOrderResourceKeyInput,
      ...paginationInputFields,
      lineNumber: lineNumberInput
    })
  )
  .output(
    z.object({
      items: z.array(orderLineSchema).describe('Purchase order lines for this page.'),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const parent = await readParentIdentity(
      client,
      '/purchaseOrders',
      ctx.input.purchaseOrderResourceKey,
      'POHeaderId'
    );
    const collection = client.childCollectionPath(
      '/purchaseOrders',
      parent.parentResourceKey,
      'lines'
    );
    const page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q:
        ctx.input.lineNumber === undefined
          ? undefined
          : adfEquals('LineNumber', ctx.input.lineNumber, lineFilterFields),
      fields: orderLineFields,
      orderBy: 'POLineId:asc',
      links: 'self'
    });
    const items = page.items.map(record => {
      assertParent(record, 'POHeaderId', parent.parentId);
      return mapOrderLine(client, collection, parent.parentResourceKey, record);
    });
    return {
      output: { ...page, items },
      message: `Found ${page.count} purchase order line${page.count === 1 ? '' : 's'} in this page.`
    };
  })
  .build();

export const listPurchaseOrderSchedules = SlateTool.create(spec, {
  name: 'List Purchase Order Schedules',
  key: 'list_purchase_order_schedules',
  description:
    'List delivery schedules for a discovered Oracle Fusion purchase order line, including delivery dates, destination, status, and received or billed quantities.',
  instructions: [
    'Discover purchaseOrderResourceKey with list_purchase_orders and lineResourceKey with list_purchase_order_lines. Keep the line paired with its returned parentResourceKey. Filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      purchaseOrderResourceKey: purchaseOrderResourceKeyInput,
      lineResourceKey: resourceKeySchema.describe(
        'Opaque line resourceKey returned by list_purchase_order_lines for this purchaseOrderResourceKey. Do not substitute the numeric purchaseOrderLineId.'
      ),
      ...paginationInputFields,
      scheduleNumber: z
        .number()
        .int()
        .positive()
        .max(Number.MAX_SAFE_INTEGER)
        .optional()
        .describe('Exact business schedule number to match within this purchase order line.'),
      statusCode: z
        .string()
        .min(1)
        .max(25)
        .optional()
        .describe('Exact Oracle schedule status code to match, such as OPEN.'),
      requestedDeliveryDate: oracleDateSchema
        .optional()
        .describe('Exact requested delivery date to match, as a real YYYY-MM-DD date.')
    })
  )
  .output(
    z.object({
      items: z.array(orderScheduleSchema).describe('Purchase order schedules for this page.'),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const q = andFilters(
      ctx.input.scheduleNumber === undefined
        ? undefined
        : adfEquals('ScheduleNumber', ctx.input.scheduleNumber, scheduleFilterFields),
      ctx.input.statusCode === undefined
        ? undefined
        : adfEquals('StatusCode', ctx.input.statusCode, scheduleFilterFields),
      ctx.input.requestedDeliveryDate === undefined
        ? undefined
        : adfEquals(
            'RequestedDeliveryDate',
            validateOracleDate(ctx.input.requestedDeliveryDate, 'Requested delivery date'),
            scheduleFilterFields
          )
    );
    const header = await readParentIdentity(
      client,
      '/purchaseOrders',
      ctx.input.purchaseOrderResourceKey,
      'POHeaderId'
    );
    const lineCollection = client.childCollectionPath(
      '/purchaseOrders',
      header.parentResourceKey,
      'lines'
    );
    const line = await client.get('fscm', lineCollection, ctx.input.lineResourceKey, {
      fields: 'POHeaderId,POLineId',
      links: 'self'
    });
    assertParent(line, 'POHeaderId', header.parentId);
    const lineResourceKey = client.resourceKey(line, 'fscm', lineCollection);
    if (lineResourceKey !== ctx.input.lineResourceKey) {
      throw createApiServiceError(
        'Oracle Fusion returned a different purchase order line than requested.',
        { reason: 'oracle_fusion_parent_mismatch' }
      );
    }
    const lineId = requireId(line, 'POLineId');
    const collection = client.childCollectionPath(
      lineCollection,
      lineResourceKey,
      'schedules'
    );
    const page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q,
      fields: orderScheduleFields,
      orderBy: 'LineLocationId:asc',
      links: 'self'
    });
    const items = page.items.map(record => {
      assertParent(record, 'POHeaderId', header.parentId);
      assertParent(record, 'POLineId', lineId);
      return mapSchedule(
        client,
        collection,
        header.parentResourceKey,
        lineResourceKey,
        record
      );
    });
    return {
      output: { ...page, items },
      message: `Found ${page.count} purchase order schedule${page.count === 1 ? '' : 's'} in this page.`
    };
  })
  .build();

export const listPurchaseRequisitions = SlateTool.create(spec, {
  name: 'List Purchase Requisitions',
  key: 'list_purchase_requisitions',
  description:
    'Find Oracle Fusion purchase requisition headers by description, requisition number, status code, or requisitioning business unit and discover keys for reading or editing eligible drafts.',
  instructions: [
    'Use a unique exact description to recover a newly created requisition if the response was interrupted. Use returned resourceKey with get_purchase_requisition and as requisitionResourceKey with list_requisition_lines. Filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      description: descriptionInput
        .optional()
        .describe('Exact requisition description to match.'),
      requisitionNumber: z
        .string()
        .min(1)
        .max(64)
        .optional()
        .describe('Exact Oracle business requisition number to match.'),
      statusCode: z
        .string()
        .min(1)
        .max(25)
        .optional()
        .describe('Exact Oracle DocumentStatusCode to match, such as INCOMPLETE.'),
      requisitioningBusinessUnitId: numericId
        .optional()
        .describe(
          'Exact RequisitioningBUId to match. Discover it with list_requisition_preferences.'
        )
    })
  )
  .output(
    z.object({
      items: z
        .array(requisitionSchema)
        .describe('Purchase requisition headers for this page.'),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const q = andFilters(
      ctx.input.description === undefined
        ? undefined
        : adfEquals('Description', ctx.input.description, requisitionFilterFields),
      ctx.input.requisitionNumber === undefined
        ? undefined
        : adfEquals('Requisition', ctx.input.requisitionNumber, requisitionFilterFields),
      ctx.input.statusCode === undefined
        ? undefined
        : adfEquals('DocumentStatusCode', ctx.input.statusCode, requisitionFilterFields),
      adfIdEquals(
        'RequisitioningBUId',
        ctx.input.requisitioningBusinessUnitId,
        requisitionFilterFields
      )
    );
    const page = await client.list('fscm', '/purchaseRequisitions', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q,
      fields: requisitionFields,
      orderBy: 'RequisitionHeaderId:asc',
      links: 'self'
    });
    return {
      output: { ...page, items: page.items.map(record => mapRequisition(client, record)) },
      message: `Found ${page.count} purchase requisition${page.count === 1 ? '' : 's'} in this page.`
    };
  })
  .build();

export const getPurchaseRequisition = SlateTool.create(spec, {
  name: 'Get Purchase Requisition',
  key: 'get_purchase_requisition',
  description:
    'Read a discovered Oracle Fusion purchase requisition header, including status, preparer, business unit, and current concurrency indicator.',
  instructions: [
    'Discover resourceKey with list_purchase_requisitions. Use the latest changeIndicator as expectedChangeIndicator for an update or deletion. Read lines separately with list_requisition_lines.'
  ],
  tags: { readOnly: true }
})
  .input(z.object({ resourceKey: requisitionResourceKeyInput }))
  .output(requisitionSchema)
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const record = await client.get('fscm', '/purchaseRequisitions', ctx.input.resourceKey, {
      fields: requisitionFields,
      links: 'self'
    });
    return {
      output: mapRequisition(client, record),
      message: 'Retrieved purchase requisition header.'
    };
  })
  .build();

export const listRequisitionLines = SlateTool.create(spec, {
  name: 'List Requisition Lines',
  key: 'list_requisition_lines',
  description:
    'List lines within a discovered Oracle Fusion purchase requisition, including catalog item, quantity, price, delivery context, and current concurrency indicators.',
  instructions: [
    'Discover requisitionResourceKey with list_purchase_requisitions. Keep each line resourceKey paired with its parentResourceKey when editing or deleting an eligible requisition line. Filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      requisitionResourceKey: requisitionResourceKeyInput,
      ...paginationInputFields,
      lineNumber: lineNumberInput
    })
  )
  .output(
    z.object({
      items: z.array(requisitionLineSchema).describe('Requisition lines for this page.'),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const parent = await readParentIdentity(
      client,
      '/purchaseRequisitions',
      ctx.input.requisitionResourceKey,
      'RequisitionHeaderId'
    );
    const collection = client.childCollectionPath(
      '/purchaseRequisitions',
      parent.parentResourceKey,
      'lines'
    );
    const page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q:
        ctx.input.lineNumber === undefined
          ? undefined
          : adfEquals('LineNumber', ctx.input.lineNumber, lineFilterFields),
      fields: requisitionLineFields,
      orderBy: 'RequisitionLineId:asc',
      links: 'self'
    });
    const items = page.items.map(record => {
      assertParent(record, 'RequisitionHeaderId', parent.parentId);
      return mapRequisitionLine(client, collection, parent.parentResourceKey, record);
    });
    return {
      output: { ...page, items },
      message: `Found ${page.count} requisition line${page.count === 1 ? '' : 's'} in this page.`
    };
  })
  .build();

export const listDraftPurchaseOrders = SlateTool.create(spec, {
  name: 'List Draft Purchase Orders',
  key: 'list_draft_purchase_orders',
  description:
    'Find Oracle Fusion draft purchase order headers by description, order number, status code, or business units and discover keys for eligible draft edits.',
  instructions: [
    'Use a unique exact description to recover a newly created draft purchase order if the response was interrupted. Order numbers can repeat across legal entities. Use returned resourceKey with get_draft_purchase_order and as draftPurchaseOrderResourceKey with list_draft_purchase_order_lines. Filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      description: descriptionInput
        .optional()
        .describe('Exact draft purchase order description to match.'),
      orderNumber: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe(
          'Exact business purchase order number to match; it can repeat across legal entities.'
        ),
      statusCode: z
        .string()
        .min(1)
        .max(40)
        .optional()
        .describe('Exact Oracle purchase order status code to match, such as INCOMPLETE.'),
      procurementBusinessUnitId: numericId
        .optional()
        .describe(
          'Exact ProcurementBUId to match. Discover it with list_procurement_business_units.'
        ),
      requisitioningBusinessUnitId: numericId
        .optional()
        .describe(
          'Exact RequisitioningBUId to match. Discover it with list_requisition_preferences or an existing purchasing document.'
        ),
      billToBusinessUnitId: numericId
        .optional()
        .describe('Exact BillToBUId to match. Discover it with list_business_units.')
    })
  )
  .output(
    z.object({
      items: z.array(draftOrderSchema).describe('Draft purchase order headers for this page.'),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const q = andFilters(
      ctx.input.description === undefined
        ? undefined
        : adfEquals('Description', ctx.input.description, draftOrderFilterFields),
      ctx.input.orderNumber === undefined
        ? undefined
        : adfEquals('OrderNumber', ctx.input.orderNumber, draftOrderFilterFields),
      ctx.input.statusCode === undefined
        ? undefined
        : adfEquals('StatusCode', ctx.input.statusCode, draftOrderFilterFields),
      adfIdEquals(
        'ProcurementBUId',
        ctx.input.procurementBusinessUnitId,
        draftOrderFilterFields
      ),
      adfIdEquals(
        'RequisitioningBUId',
        ctx.input.requisitioningBusinessUnitId,
        draftOrderFilterFields
      ),
      adfIdEquals('BillToBUId', ctx.input.billToBusinessUnitId, draftOrderFilterFields)
    );
    const page = await client.list('fscm', '/draftPurchaseOrders', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q,
      fields: draftOrderFields,
      orderBy: 'POHeaderId:asc',
      links: 'self'
    });
    return {
      output: { ...page, items: page.items.map(record => mapDraftOrder(client, record)) },
      message: `Found ${page.count} draft purchase order${page.count === 1 ? '' : 's'} in this page.`
    };
  })
  .build();

export const getDraftPurchaseOrder = SlateTool.create(spec, {
  name: 'Get Draft Purchase Order',
  key: 'get_draft_purchase_order',
  description:
    'Read a discovered Oracle Fusion draft purchase order header, including lifecycle state, supplier, buyer, business units, and current concurrency indicator.',
  instructions: [
    'Discover resourceKey with list_draft_purchase_orders. Use the latest changeIndicator as expectedChangeIndicator for an update or deletion. Read lines separately with list_draft_purchase_order_lines.'
  ],
  tags: { readOnly: true }
})
  .input(z.object({ resourceKey: draftPurchaseOrderResourceKeyInput }))
  .output(draftOrderSchema)
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const record = await client.get('fscm', '/draftPurchaseOrders', ctx.input.resourceKey, {
      fields: draftOrderFields,
      links: 'self'
    });
    return {
      output: mapDraftOrder(client, record),
      message: 'Retrieved draft purchase order header.'
    };
  })
  .build();

export const listDraftPurchaseOrderLines = SlateTool.create(spec, {
  name: 'List Draft Purchase Order Lines',
  key: 'list_draft_purchase_order_lines',
  description:
    'List lines within a discovered Oracle Fusion draft purchase order, including catalog item, quantity, price, and current concurrency indicators.',
  instructions: [
    'Discover draftPurchaseOrderResourceKey with list_draft_purchase_orders. Keep each line resourceKey paired with its parentResourceKey when editing or deleting an eligible draft purchase order line. Filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      draftPurchaseOrderResourceKey: draftPurchaseOrderResourceKeyInput,
      ...paginationInputFields,
      lineNumber: lineNumberInput
    })
  )
  .output(
    z.object({
      items: z.array(orderLineSchema).describe('Draft purchase order lines for this page.'),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const parent = await readParentIdentity(
      client,
      '/draftPurchaseOrders',
      ctx.input.draftPurchaseOrderResourceKey,
      'POHeaderId'
    );
    const collection = client.childCollectionPath(
      '/draftPurchaseOrders',
      parent.parentResourceKey,
      'lines'
    );
    const page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q:
        ctx.input.lineNumber === undefined
          ? undefined
          : adfEquals('LineNumber', ctx.input.lineNumber, lineFilterFields),
      fields: draftOrderLineFields,
      orderBy: 'POLineId:asc',
      links: 'self'
    });
    const items = page.items.map(record => {
      assertParent(record, 'POHeaderId', parent.parentId);
      return mapOrderLine(client, collection, parent.parentResourceKey, record);
    });
    return {
      output: { ...page, items },
      message: `Found ${page.count} draft purchase order line${page.count === 1 ? '' : 's'} in this page.`
    };
  })
  .build();

export const procurementReadTools = {
  list_purchase_order_lines: listPurchaseOrderLines,
  list_purchase_order_schedules: listPurchaseOrderSchedules,
  list_purchase_requisitions: listPurchaseRequisitions,
  get_purchase_requisition: getPurchaseRequisition,
  list_requisition_lines: listRequisitionLines,
  list_draft_purchase_orders: listDraftPurchaseOrders,
  get_draft_purchase_order: getDraftPurchaseOrder,
  list_draft_purchase_order_lines: listDraftPurchaseOrderLines
};
