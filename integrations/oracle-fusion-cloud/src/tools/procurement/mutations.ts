import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import {
  type OracleCollectionPath,
  OracleFusionClient,
  type OracleMutationParams
} from '../../lib/client';
import { validateOracleDate } from '../../lib/dates';
import { type OracleRecord, stringField } from '../../lib/records';
import { resourceKeySchema } from '../../lib/schemas';
import { spec } from '../../spec';
import {
  descriptionInput,
  draftOrderFields,
  draftOrderLineFields,
  draftOrderSchema,
  expectedIndicatorInput,
  mapDraftOrder,
  mapOrderLine,
  mapRequisition,
  mapRequisitionLine,
  numericId,
  orderLineSchema,
  requireId,
  requisitionFields,
  requisitionLineFields,
  requisitionLineSchema,
  requisitionSchema
} from './models';
import {
  readCatalogGoods,
  readEligibleHeader,
  readEligibleLine,
  readStandardDocumentStyle,
  requireDraftOrderEligibility,
  requireExpectedIndicator,
  requireLineEligibility,
  requireRequisitionEligibility
} from './safety';

const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .describe('Three-letter currency code, such as USD, accepted by the Oracle business unit.');
const businessName = (description: string, max = 240) =>
  z.string().min(1).max(max).describe(description);
const catalogLineFields = {
  itemResourceKey: resourceKeySchema.describe(
    'Catalog item resourceKey from list_items or get_item. The item must belong to this line delivery organization.'
  ),
  lineTypeResourceKey: resourceKeySchema.describe(
    'Resource key from list_purchasing_line_types for catalog Goods with a Quantity purchase basis.'
  ),
  quantity: z
    .number()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .describe(
      'Initial ordered quantity. The tool sets the same quantity on its single distribution and, for purchase orders, its single schedule.'
    ),
  unitPrice: z
    .number()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER)
    .describe('Initial unit price in the specified currency.'),
  requestedDeliveryDate: z.string().describe('Requested delivery date in YYYY-MM-DD format.'),
  requesterId: numericId.describe(
    'Requester personId from list_procurement_requesters or requesterId from list_requisition_preferences.'
  ),
  deliverToLocationId: numericId.describe(
    'Final deliver-to location ID from requisition preferences or an existing purchasing document reference valid for this business unit.'
  ),
  chargeAccountId: numericId.describe(
    'CodeCombinationId returned as codeCombinationId by list_requisition_charge_accounts, or an existing purchasing reference valid for the selected business unit.'
  ),
  categoryName: businessName(
    'Optional exact purchasing category name. Omit to let Oracle derive the category from the selected catalog item.',
    2400
  ).optional()
};
export const requisitionCreateLineSchema = z.object({
  ...catalogLineFields,
  destinationOrganizationId: numericId.describe(
    'Destination inventory organization ID from list_requisition_preferences; must match the catalog item organization.'
  ),
  currencyCode: currencySchema,
  itemDescription: descriptionInput
    .optional()
    .describe(
      'Optional catalog line description, up to 240 characters. Defaults to the current catalog item description.'
    )
});
export const draftOrderCreateLineSchema = z.object({
  ...catalogLineFields,
  shipToOrganizationId: numericId.describe(
    'Ship-to inventory organization ID from requisition preferences or list_inventory_organizations; must match the catalog item organization.'
  ),
  shipToOrganization: businessName(
    'Exact name of the ship-to inventory organization from the same preferences or inventory organization result as shipToOrganizationId.'
  ),
  shipToLocation: businessName(
    'Exact ship-to location name from an existing purchasing reference or the business location selected by the caller. A worker location alone does not establish procurement eligibility.'
  ),
  description: descriptionInput
    .optional()
    .describe(
      'Optional purchase order line description, up to 240 characters. Defaults to the current catalog item description.'
    ),
  receiptRouting: z
    .enum(['standard_receipt', 'inspection_required', 'direct_delivery'])
    .describe(
      'Initial receiving route for this schedule. Standard receipt, inspection required, and direct delivery correspond to Oracle routing IDs 1, 2, and 3.'
    ),
  invoiceMatchOption: z
    .enum(['purchase_order', 'receipt'])
    .describe(
      'Whether an invoice for this schedule matches the purchase order or the receipt.'
    ),
  receiptRequired: z
    .boolean()
    .describe(
      'Whether the schedule must be received before an invoice can be paid. This is a draft setting; the tool does not receive goods or pay invoices.'
    ),
  inspectionRequired: z
    .boolean()
    .describe(
      'Whether inspection is required before invoice payment. This is a draft setting; the tool does not perform inspections.'
    ),
  receiptCloseTolerancePercent: z
    .number()
    .min(0)
    .max(100)
    .default(0)
    .describe('Percentage used to close partially received schedules.'),
  invoiceCloseTolerancePercent: z
    .number()
    .min(0)
    .max(100)
    .default(0)
    .describe('Percentage used to close partially invoiced schedules.')
});
const createInstructions = [
  'Creates an original incomplete document only. Select existing catalog goods, requester preferences, a Goods line type with Quantity basis, and a charge account valid for the selected business unit. Each line has exactly one distribution; draft purchase order lines also have exactly one schedule. No submission, approval, payment, posting, cancellation, or change order is performed.',
  'Creation converts string business identifiers into exact JSON integers as required by Oracle. Identifiers above 9007199254740991 are rejected before creation to avoid changing their value.',
  'Use a unique description for recovery. If creation times out or the response is interrupted, search the corresponding list tool with that exact description and inspect the returned requisitionNumber or orderNumber before deciding whether to create again. An interrupted response can mean Oracle created the document; do not retry automatically.'
];
const requestId = (value: string, label: string): number => {
  const id = Number(value);
  if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
    throw createApiServiceError(
      `${label} cannot be represented exactly in Oracle's numeric JSON request field. Creation supports positive identifiers up to ${Number.MAX_SAFE_INTEGER}; no creation request was sent.`,
      { reason: 'oracle_fusion_unsafe_numeric_identifier' }
    );
  }
  return id;
};
const lineDescription = (value: string | undefined) => {
  if (!value || value.length > 240)
    throw createApiServiceError(
      'Provide a line description of 1 to 240 characters; the catalog item description cannot be used at that length.',
      { reason: 'oracle_fusion_invalid_procurement_description' }
    );
  return value;
};
const createOriginal = async <T>(
  client: OracleFusionClient,
  collection: '/purchaseRequisitions' | '/draftPurchaseOrders',
  body: OracleRecord,
  description: string,
  map: (client: OracleFusionClient, record: OracleRecord) => T
): Promise<T> => {
  let key: string | undefined;
  const readTool =
    collection === '/purchaseRequisitions'
      ? 'get_purchase_requisition'
      : 'get_draft_purchase_order';
  const listTool =
    collection === '/purchaseRequisitions'
      ? 'list_purchase_requisitions'
      : 'list_draft_purchase_orders';
  try {
    const created = await client.create('fscm', collection, body, { links: 'self' });
    // Assignment happens only after origin, collection, and key validation succeeds.
    key = client.optionalResourceKey(created, 'fscm', collection);
    if (!key)
      throw createApiServiceError('Oracle did not return a usable created resource key.', {
        reason: 'oracle_fusion_missing_resource_link'
      });
    const record = await readEligibleHeader(client, collection, key);
    const idField =
      collection === '/purchaseRequisitions' ? 'RequisitionHeaderId' : 'POHeaderId';
    if (requireId(record, idField) !== requireId(created, idField))
      throw createApiServiceError('Oracle returned a different created document identifier.', {
        reason: 'oracle_fusion_invalid_response'
      });
    const headerIdentityFields =
      collection === '/purchaseRequisitions'
        ? ['PreparerId', 'RequisitioningBUId']
        : [
            'ProcurementBUId',
            'RequisitioningBUId',
            'BuyerId',
            'DocumentStyleId',
            'SupplierId',
            'SupplierSiteId'
          ];
    if (
      stringField(record, 'Description') !== description ||
      headerIdentityFields.some(field => requireId(record, field) !== String(body[field])) ||
      (collection === '/draftPurchaseOrders' &&
        stringField(record, 'CurrencyCode') !== body.CurrencyCode)
    )
      throw createApiServiceError(
        'Oracle returned a created document with different business details than requested.',
        { reason: 'oracle_fusion_invalid_response' }
      );
    return map(client, record);
  } catch (error) {
    const recovery = key
      ? `Read ${readTool} with resourceKey "${key}" or use ${listTool} with the exact description "${description}".`
      : `No trusted resource key is available. Use ${listTool} with the exact description "${description}" and inspect its returned resourceKey and document number.`;
    throw createApiServiceError(
      `Oracle creation or its original incomplete state could not be verified. Creation may have completed. ${recovery} Review the current state before any further action; do not retry creation automatically.`,
      { reason: 'oracle_fusion_created_document_unverified', parent: error }
    );
  }
};
const patchOriginal = async <T>(
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  key: string,
  current: OracleRecord,
  identityFields: readonly string[],
  body: OracleRecord,
  params: OracleMutationParams,
  requireEligibility: (record: OracleRecord) => void,
  map: (record: OracleRecord) => T,
  recovery: string
): Promise<T> => {
  const identities = identityFields.map(field => [field, requireId(current, field)] as const);
  try {
    const record = await client.patch('fscm', collection, key, body, params);
    if (
      client.resourceKey(record, 'fscm', collection) !== key ||
      identities.some(([field, value]) => requireId(record, field) !== value) ||
      Object.entries(body).some(([field, value]) => stringField(record, field) !== value)
    )
      throw createApiServiceError(
        'Oracle returned a different document, line, or updated text than requested.',
        { reason: 'oracle_fusion_invalid_response' }
      );
    requireEligibility(record);
    return map(record);
  } catch (error) {
    throw createApiServiceError(
      `Oracle update or its returned state could not be verified. The update may have completed. ${recovery} Review the current state before any further action; do not retry the update automatically.`,
      { reason: 'oracle_fusion_updated_document_unverified', parent: error }
    );
  }
};

export const createPurchaseRequisition = SlateTool.create(spec, {
  name: 'Create Purchase Requisition',
  key: 'create_purchase_requisition',
  description:
    'Create an original incomplete purchase requisition for catalog goods delivered to an expense destination, using typed lines and a single charge-account distribution per line.',
  instructions: createInstructions
})
  .input(
    z.object({
      description: descriptionInput,
      justification: businessName(
        'Business reason for creating the requisition.',
        1000
      ).optional(),
      preparerId: numericId.describe(
        'Preparer personId from list_procurement_requesters or personId from list_requisition_preferences.'
      ),
      requisitioningBusinessUnitId: numericId.describe(
        'Requisitioning business unit ID from list_requisition_preferences. A financial or procurement business unit result alone is not a requisitioning preference.'
      ),
      lines: z
        .array(requisitionCreateLineSchema)
        .min(1)
        .max(50)
        .describe('Catalog goods lines, each with one expense distribution.')
    })
  )
  .output(requisitionSchema)
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const lines: OracleRecord[] = [];
    for (const [index, line] of ctx.input.lines.entries()) {
      validateOracleDate(line.requestedDeliveryDate, `lines[${index}].requestedDeliveryDate`);
      const goods = await readCatalogGoods(
        client,
        line.itemResourceKey,
        line.lineTypeResourceKey,
        line.destinationOrganizationId
      );
      lines.push(
        pickDefined({
          LineNumber: index + 1,
          LineTypeId: requestId(goods.lineTypeId, 'LineTypeId'),
          ItemId: requestId(goods.itemId, 'ItemId'),
          ItemDescription: lineDescription(line.itemDescription ?? goods.itemDescription),
          CategoryName: line.categoryName,
          Quantity: line.quantity,
          Price: line.unitPrice,
          CurrencyCode: line.currencyCode,
          UOM: goods.uom,
          RequestedDeliveryDate: line.requestedDeliveryDate,
          RequesterId: requestId(line.requesterId, 'RequesterId'),
          DeliverToLocationId: requestId(line.deliverToLocationId, 'DeliverToLocationId'),
          DestinationOrganizationId: requestId(
            line.destinationOrganizationId,
            'DestinationOrganizationId'
          ),
          DestinationTypeCode: 'EXPENSE',
          SourceTypeCode: 'EXTERNAL',
          distributions: [
            {
              DistributionNumber: 1,
              Quantity: line.quantity,
              ChargeAccountId: requestId(line.chargeAccountId, 'ChargeAccountId')
            }
          ]
        })
      );
    }
    const body = pickDefined({
      PreparerId: requestId(ctx.input.preparerId, 'PreparerId'),
      RequisitioningBUId: requestId(
        ctx.input.requisitioningBusinessUnitId,
        'RequisitioningBUId'
      ),
      Description: ctx.input.description,
      Justification: ctx.input.justification,
      lines
    });
    const output = await createOriginal(
      client,
      '/purchaseRequisitions',
      body,
      ctx.input.description,
      mapRequisition
    );
    return {
      output,
      message:
        'Created an incomplete purchase requisition. Read its lines and review the document in Oracle before any later submission.'
    };
  })
  .build();

export const createDraftPurchaseOrder = SlateTool.create(spec, {
  name: 'Create Draft Purchase Order',
  key: 'create_draft_purchase_order',
  description:
    'Create an original incomplete standard purchase order for catalog goods with one expense schedule and one charge-account distribution per line.',
  instructions: [
    ...createInstructions,
    'Discover buyer-enabled procurement business units and buyers with the procurement lookup tools. Select an enabled STANDARD purchasing document style. Choose a purchasing supplier site belonging to that procurement business unit. Bill-to and ship-to names must be valid procurement locations; do not infer them from worker records.'
  ]
})
  .input(
    z.object({
      description: descriptionInput,
      procurementBusinessUnitId: numericId.describe(
        'Buyer-enabled procurement business unit ID from list_procurement_business_units.'
      ),
      requisitioningBusinessUnitId: numericId.describe(
        'Requisitioning business unit ID from list_requisition_preferences or an existing purchasing document for this context.'
      ),
      buyerId: numericId.describe(
        'Buyer ID returned by list_buyers for the selected procurement business unit.'
      ),
      documentStyleResourceKey: resourceKeySchema.describe(
        'Resource key of an enabled STANDARD style from list_purchasing_document_styles.'
      ),
      supplierId: numericId.describe(
        'Supplier ID discovered with list_suppliers or get_supplier.'
      ),
      supplierSiteId: numericId.describe(
        'Purchasing supplier site ID from list_supplier_sites for this supplier and procurement business unit.'
      ),
      currencyCode: currencySchema,
      billToBusinessUnit: businessName(
        'Optional exact bill-to business unit name from a purchasing reference or selected by the caller. Oracle derives the bill-to business unit when omitted.'
      ).optional(),
      billToLocation: businessName(
        'Exact bill-to location name where the supplier sends invoices, from a purchasing reference or selected by the caller.',
        60
      ),
      lines: z
        .array(draftOrderCreateLineSchema)
        .min(1)
        .max(50)
        .describe(
          'Catalog goods lines with explicit receiving settings and one expense schedule and distribution each.'
        )
    })
  )
  .output(draftOrderSchema)
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const documentStyleId = await readStandardDocumentStyle(
      client,
      ctx.input.documentStyleResourceKey
    );
    const lines: OracleRecord[] = [];
    for (const [index, line] of ctx.input.lines.entries()) {
      validateOracleDate(line.requestedDeliveryDate, `lines[${index}].requestedDeliveryDate`);
      const goods = await readCatalogGoods(
        client,
        line.itemResourceKey,
        line.lineTypeResourceKey,
        line.shipToOrganizationId
      );
      lines.push(
        pickDefined({
          LineNumber: index + 1,
          LineTypeId: requestId(goods.lineTypeId, 'LineTypeId'),
          LineType: goods.lineType,
          ItemId: requestId(goods.itemId, 'ItemId'),
          Description: lineDescription(line.description ?? goods.itemDescription),
          Category: line.categoryName,
          Quantity: line.quantity,
          Price: line.unitPrice,
          UOM: goods.uom,
          schedules: [
            {
              ScheduleNumber: 1,
              Quantity: line.quantity,
              Price: line.unitPrice,
              ShipToLocation: line.shipToLocation,
              ShipToOrganizationId: requestId(
                line.shipToOrganizationId,
                'ShipToOrganizationId'
              ),
              ShipToOrganization: line.shipToOrganization,
              RequestedDeliveryDate: line.requestedDeliveryDate,
              DestinationTypeCode: 'EXPENSE',
              ReceiptRoutingId: {
                standard_receipt: 1,
                inspection_required: 2,
                direct_delivery: 3
              }[line.receiptRouting],
              InvoiceMatchOptionCode: line.invoiceMatchOption === 'purchase_order' ? 'P' : 'R',
              ReceiptRequiredFlag: line.receiptRequired,
              InspectionRequiredFlag: line.inspectionRequired,
              ReceiptCloseTolerancePercent: line.receiptCloseTolerancePercent,
              InvoiceCloseTolerancePercent: line.invoiceCloseTolerancePercent,
              distributions: [
                {
                  DistributionNumber: 1,
                  Quantity: line.quantity,
                  POChargeAccountId: requestId(line.chargeAccountId, 'POChargeAccountId'),
                  DeliverToLocationId: requestId(
                    line.deliverToLocationId,
                    'DeliverToLocationId'
                  ),
                  RequesterId: requestId(line.requesterId, 'RequesterId')
                }
              ]
            }
          ]
        })
      );
    }
    const body = pickDefined({
      ProcurementBUId: requestId(ctx.input.procurementBusinessUnitId, 'ProcurementBUId'),
      RequisitioningBUId: requestId(
        ctx.input.requisitioningBusinessUnitId,
        'RequisitioningBUId'
      ),
      BuyerId: requestId(ctx.input.buyerId, 'BuyerId'),
      DocumentStyleId: requestId(documentStyleId, 'DocumentStyleId'),
      SupplierId: requestId(ctx.input.supplierId, 'SupplierId'),
      SupplierSiteId: requestId(ctx.input.supplierSiteId, 'SupplierSiteId'),
      CurrencyCode: ctx.input.currencyCode,
      BillToBU: ctx.input.billToBusinessUnit,
      BillToLocation: ctx.input.billToLocation,
      Description: ctx.input.description,
      StatusCode: 'INCOMPLETE',
      SupplierCommunicationMethod: 'NONE',
      lines
    });
    const output = await createOriginal(
      client,
      '/draftPurchaseOrders',
      body,
      ctx.input.description,
      mapDraftOrder
    );
    return {
      output,
      message:
        'Created an incomplete draft purchase order. Read its lines and review the document in Oracle before any later submission.'
    };
  })
  .build();

export const updatePurchaseRequisition = SlateTool.create(spec, {
  name: 'Update Purchase Requisition',
  key: 'update_purchase_requisition',
  description:
    'Change only the description or justification of an original incomplete requisition after checking its latest state and change indicator.',
  instructions: [
    'Read get_purchase_requisition immediately before this operation. Only original INCOMPLETE requisitions with no submission or approval date are supported. At least one of description or justification is required; quantities, prices, distributions, and lifecycle status are not editable.'
  ]
})
  .input(
    z.object({
      resourceKey: resourceKeySchema,
      expectedChangeIndicator: expectedIndicatorInput,
      description: descriptionInput.optional(),
      justification: businessName('Replacement business justification.', 1000).optional()
    })
  )
  .output(requisitionSchema)
  .handleInvocation(async ctx => {
    if (ctx.input.description === undefined && ctx.input.justification === undefined)
      throw createApiServiceError(
        'Provide a description or justification to update the requisition.',
        { reason: 'oracle_fusion_empty_update' }
      );
    const client = new OracleFusionClient(ctx.auth);
    const current = await readEligibleHeader(
      client,
      '/purchaseRequisitions',
      ctx.input.resourceKey
    );
    const indicator = requireExpectedIndicator(current, ctx.input.expectedChangeIndicator);
    const output = await patchOriginal(
      client,
      '/purchaseRequisitions',
      ctx.input.resourceKey,
      current,
      ['RequisitionHeaderId'],
      pickDefined({
        Description: ctx.input.description,
        Justification: ctx.input.justification
      }),
      { ifMatch: indicator, fields: requisitionFields, links: 'self' },
      requireRequisitionEligibility,
      record => mapRequisition(client, record),
      `Read get_purchase_requisition with resourceKey "${ctx.input.resourceKey}".`
    );
    return {
      output,
      message: 'Updated the incomplete requisition description or justification.'
    };
  })
  .build();

export const updateDraftPurchaseOrder = SlateTool.create(spec, {
  name: 'Update Draft Purchase Order',
  key: 'update_draft_purchase_order',
  description:
    'Change only the header description of an original incomplete purchase order, using a fresh state check and a conditional update.',
  instructions: [
    'Read get_draft_purchase_order to obtain expectedChangeIndicator. Unknown state, cancellation, submission, approval, and change orders are not eligible. This tool changes only Description.'
  ]
})
  .input(
    z.object({
      resourceKey: resourceKeySchema,
      expectedChangeIndicator: expectedIndicatorInput,
      description: descriptionInput
    })
  )
  .output(draftOrderSchema)
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const current = await readEligibleHeader(
      client,
      '/draftPurchaseOrders',
      ctx.input.resourceKey
    );
    const indicator = requireExpectedIndicator(current, ctx.input.expectedChangeIndicator);
    const output = await patchOriginal(
      client,
      '/draftPurchaseOrders',
      ctx.input.resourceKey,
      current,
      ['POHeaderId'],
      { Description: ctx.input.description },
      { ifMatch: indicator, fields: draftOrderFields, links: 'self' },
      requireDraftOrderEligibility,
      record => mapDraftOrder(client, record),
      `Read get_draft_purchase_order with resourceKey "${ctx.input.resourceKey}".`
    );
    return {
      output,
      message: 'Updated the incomplete purchase order description.'
    };
  })
  .build();

export const updateRequisitionLine = SlateTool.create(spec, {
  name: 'Update Requisition Line',
  key: 'update_requisition_line',
  description:
    'Change only a requisition line description on its original incomplete parent, validating ownership and current parent and line change indicators.',
  instructions: [
    'Use requisitionResourceKey from get_purchase_requisition and lineResourceKey from list_requisition_lines. Read both immediately before the change. Pass their respective indicators as expectedParentChangeIndicator and expectedChangeIndicator. Quantities, prices, delivery, charge accounts, and lifecycle status are not editable.'
  ]
})
  .input(
    z.object({
      requisitionResourceKey: resourceKeySchema,
      lineResourceKey: resourceKeySchema,
      expectedParentChangeIndicator: expectedIndicatorInput.describe(
        'Latest header changeIndicator from get_purchase_requisition.'
      ),
      expectedChangeIndicator: expectedIndicatorInput,
      itemDescription: descriptionInput
    })
  )
  .output(requisitionLineSchema)
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const current = await readEligibleLine(
      client,
      '/purchaseRequisitions',
      ctx.input.requisitionResourceKey,
      ctx.input.lineResourceKey,
      ctx.input.expectedParentChangeIndicator,
      ctx.input.expectedChangeIndicator
    );
    const output = await patchOriginal(
      client,
      current.collection,
      ctx.input.lineResourceKey,
      current.record,
      ['RequisitionHeaderId', 'RequisitionLineId'],
      { ItemDescription: ctx.input.itemDescription },
      { ifMatch: current.indicator, fields: requisitionLineFields, links: 'self' },
      record => requireLineEligibility(record, '/purchaseRequisitions'),
      record =>
        mapRequisitionLine(
          client,
          current.collection,
          ctx.input.requisitionResourceKey,
          record
        ),
      `Read get_purchase_requisition with resourceKey "${ctx.input.requisitionResourceKey}", then list_requisition_lines with requisitionResourceKey "${ctx.input.requisitionResourceKey}" and inspect the line with resourceKey "${ctx.input.lineResourceKey}".`
    );
    return {
      output,
      message: 'Updated the incomplete requisition line description.'
    };
  })
  .build();

export const updateDraftPoLine = SlateTool.create(spec, {
  name: 'Update Draft Purchase Order Line',
  key: 'update_draft_po_line',
  description:
    'Change only an uncanceled line description on an original incomplete purchase order after validating ownership and both current change indicators.',
  instructions: [
    'Use draftPurchaseOrderResourceKey from get_draft_purchase_order and lineResourceKey from list_draft_purchase_order_lines. Pass the latest header and line indicators as expectedParentChangeIndicator and expectedChangeIndicator. Quantities, prices, schedules, distributions, and lifecycle status are not editable.'
  ]
})
  .input(
    z.object({
      draftPurchaseOrderResourceKey: resourceKeySchema,
      lineResourceKey: resourceKeySchema,
      expectedParentChangeIndicator: expectedIndicatorInput.describe(
        'Latest header changeIndicator from get_draft_purchase_order.'
      ),
      expectedChangeIndicator: expectedIndicatorInput,
      description: descriptionInput
    })
  )
  .output(orderLineSchema)
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const current = await readEligibleLine(
      client,
      '/draftPurchaseOrders',
      ctx.input.draftPurchaseOrderResourceKey,
      ctx.input.lineResourceKey,
      ctx.input.expectedParentChangeIndicator,
      ctx.input.expectedChangeIndicator
    );
    const output = await patchOriginal(
      client,
      current.collection,
      ctx.input.lineResourceKey,
      current.record,
      ['POHeaderId', 'POLineId'],
      { Description: ctx.input.description },
      { ifMatch: current.indicator, fields: draftOrderLineFields, links: 'self' },
      record => requireLineEligibility(record, '/draftPurchaseOrders'),
      record =>
        mapOrderLine(
          client,
          current.collection,
          ctx.input.draftPurchaseOrderResourceKey,
          record
        ),
      `Read get_draft_purchase_order with resourceKey "${ctx.input.draftPurchaseOrderResourceKey}", then list_draft_purchase_order_lines with draftPurchaseOrderResourceKey "${ctx.input.draftPurchaseOrderResourceKey}" and inspect the line with resourceKey "${ctx.input.lineResourceKey}".`
    );
    return {
      output,
      message: 'Updated the incomplete purchase order line description.'
    };
  })
  .build();

export const deletePurchaseRequisition = SlateTool.create(spec, {
  name: 'Delete Purchase Requisition',
  key: 'delete_purchase_requisition',
  description:
    'Delete an original incomplete purchase requisition that has never been submitted or approved, after checking the current change indicator.',
  instructions: [
    'Read get_purchase_requisition to confirm the current state and provide its latest changeIndicator. Deletes the header and its draft lines. Submitted, approved, or unknown states are rejected. If the response is interrupted, get the same resource key to confirm whether deletion completed before retrying.'
  ]
})
  .input(
    z.object({
      resourceKey: resourceKeySchema,
      expectedChangeIndicator: expectedIndicatorInput
    })
  )
  .output(
    z.object({
      resourceKey: resourceKeySchema,
      requisitionId: z.string().describe('Deleted Oracle requisition identifier.'),
      requisitionNumber: z
        .string()
        .optional()
        .describe('Deleted business requisition number.'),
      deleted: z.literal(true).describe('Oracle confirmed deletion.')
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const current = await readEligibleHeader(
      client,
      '/purchaseRequisitions',
      ctx.input.resourceKey
    );
    const indicator = requireExpectedIndicator(current, ctx.input.expectedChangeIndicator);
    const mapped = mapRequisition(client, current);
    await client.delete('fscm', '/purchaseRequisitions', ctx.input.resourceKey, {
      ifMatch: indicator
    });
    return {
      output: {
        resourceKey: ctx.input.resourceKey,
        requisitionId: requireId(current, 'RequisitionHeaderId'),
        requisitionNumber: mapped.requisitionNumber,
        deleted: true as const
      },
      message: 'Deleted the original incomplete requisition.'
    };
  })
  .build();

export const deleteDraftPurchaseOrder = SlateTool.create(spec, {
  name: 'Delete Draft Purchase Order',
  key: 'delete_draft_purchase_order',
  description:
    'Delete an original incomplete purchase order after verifying it is uncanceled, is not a change order, and still has the expected Oracle change indicator.',
  instructions: [
    'Read get_draft_purchase_order immediately before deletion. Deletes the original incomplete order and its draft children. Unknown state or any change order is rejected. If the response is interrupted, read the same resource key to confirm whether deletion completed before retrying.'
  ]
})
  .input(
    z.object({
      resourceKey: resourceKeySchema,
      expectedChangeIndicator: expectedIndicatorInput
    })
  )
  .output(
    z.object({
      resourceKey: resourceKeySchema,
      purchaseOrderId: z.string().describe('Deleted Oracle purchase order identifier.'),
      orderNumber: z.string().optional().describe('Deleted business purchase order number.'),
      deleted: z.literal(true).describe('Oracle confirmed deletion.')
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const current = await readEligibleHeader(
      client,
      '/draftPurchaseOrders',
      ctx.input.resourceKey
    );
    const indicator = requireExpectedIndicator(current, ctx.input.expectedChangeIndicator);
    const mapped = mapDraftOrder(client, current);
    await client.delete('fscm', '/draftPurchaseOrders', ctx.input.resourceKey, {
      ifMatch: indicator
    });
    return {
      output: {
        resourceKey: ctx.input.resourceKey,
        purchaseOrderId: requireId(current, 'POHeaderId'),
        orderNumber: mapped.orderNumber,
        deleted: true as const
      },
      message: 'Deleted the original incomplete purchase order.'
    };
  })
  .build();

export const procurementMutationTools = {
  create_purchase_requisition: createPurchaseRequisition,
  update_purchase_requisition: updatePurchaseRequisition,
  update_requisition_line: updateRequisitionLine,
  delete_purchase_requisition: deletePurchaseRequisition,
  create_draft_purchase_order: createDraftPurchaseOrder,
  update_draft_purchase_order: updateDraftPurchaseOrder,
  update_draft_po_line: updateDraftPoLine,
  delete_draft_purchase_order: deleteDraftPurchaseOrder
};
