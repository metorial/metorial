import { SlateTool } from 'slates';
import { z } from 'zod';
import { andFilters, odataDateTimeLiteral, odataStringLiteral } from '../lib/client';
import { spec } from '../spec';
import {
  compactOutput,
  createClient,
  ensureFilteredQuery,
  navigationArray,
  pageInputSchema,
  pageOutputSchema,
  pageSummary,
  rawRecordSchema,
  stringValue,
  topValue
} from './shared';

const serviceName = 'API_PURCHASEORDER_PROCESS_SRV';

let purchaseOrderItemSchema = z.object({
  purchaseOrder: z.string().optional().describe('Purchase order id.'),
  purchaseOrderItem: z.string().optional().describe('Purchase order item number.'),
  material: z.string().optional().describe('Material/product id.'),
  plant: z.string().optional().describe('Plant.'),
  orderQuantity: z.string().optional().describe('Order quantity.'),
  purchaseOrderQuantityUnit: z.string().optional().describe('Quantity unit.'),
  netPriceAmount: z.string().optional().describe('Item net price amount.'),
  documentCurrency: z.string().optional().describe('Document currency.'),
  record: rawRecordSchema
});

let purchaseOrderSchema = z.object({
  purchaseOrder: z.string().optional().describe('SAP purchase order id.'),
  purchaseOrderType: z.string().optional().describe('Purchase order type.'),
  supplier: z.string().optional().describe('Supplier id.'),
  companyCode: z.string().optional().describe('Company code.'),
  purchasingOrganization: z.string().optional().describe('Purchasing organization.'),
  purchasingGroup: z.string().optional().describe('Purchasing group.'),
  documentCurrency: z.string().optional().describe('Document currency.'),
  purchaseOrderDate: z.string().optional().describe('Purchase order date.'),
  purchasingProcessingStatus: z.string().optional().describe('Processing status.'),
  items: z
    .array(purchaseOrderItemSchema)
    .optional()
    .describe('Expanded purchase order items.'),
  record: rawRecordSchema
});

let mapPurchaseOrderItem = (item: Record<string, unknown>) => ({
  ...compactOutput({
    purchaseOrder: stringValue(item, 'PurchaseOrder'),
    purchaseOrderItem: stringValue(item, 'PurchaseOrderItem'),
    material: stringValue(item, 'Material'),
    plant: stringValue(item, 'Plant'),
    orderQuantity: stringValue(item, 'OrderQuantity'),
    purchaseOrderQuantityUnit: stringValue(item, 'PurchaseOrderQuantityUnit'),
    netPriceAmount: stringValue(item, 'NetPriceAmount'),
    documentCurrency: stringValue(item, 'DocumentCurrency')
  }),
  record: item
});

let mapPurchaseOrder = (order: Record<string, unknown>) => {
  let items = navigationArray(order, 'to_PurchaseOrderItem').map(mapPurchaseOrderItem);

  return {
    ...compactOutput({
      purchaseOrder: stringValue(order, 'PurchaseOrder'),
      purchaseOrderType: stringValue(order, 'PurchaseOrderType'),
      supplier: stringValue(order, 'Supplier'),
      companyCode: stringValue(order, 'CompanyCode'),
      purchasingOrganization: stringValue(order, 'PurchasingOrganization'),
      purchasingGroup: stringValue(order, 'PurchasingGroup'),
      documentCurrency: stringValue(order, 'DocumentCurrency'),
      purchaseOrderDate: stringValue(order, 'PurchaseOrderDate'),
      purchasingProcessingStatus: stringValue(order, 'PurchasingProcessingStatus'),
      items: items.length > 0 ? items : undefined
    }),
    record: order
  };
};

let buildPurchaseOrderFilters = (input: {
  purchaseOrder?: string;
  supplier?: string;
  purchasingOrganization?: string;
  companyCode?: string;
  createdSince?: string;
}) =>
  andFilters([
    input.purchaseOrder
      ? `PurchaseOrder eq ${odataStringLiteral(input.purchaseOrder)}`
      : undefined,
    input.supplier ? `Supplier eq ${odataStringLiteral(input.supplier)}` : undefined,
    input.purchasingOrganization
      ? `PurchasingOrganization eq ${odataStringLiteral(input.purchasingOrganization)}`
      : undefined,
    input.companyCode ? `CompanyCode eq ${odataStringLiteral(input.companyCode)}` : undefined,
    input.createdSince
      ? `CreationDate ge ${odataDateTimeLiteral(input.createdSince, 'datetime')}`
      : undefined
  ]);

export let listPurchaseOrders = SlateTool.create(spec, {
  name: 'List Purchase Orders',
  key: 'list_purchase_orders',
  description:
    'List SAP S/4HANA purchase order headers for procure-to-pay visibility, supplier lookup, and purchasing reporting.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      purchaseOrder: z.string().optional().describe('Exact SAP purchase order id.'),
      supplier: z.string().optional().describe('Supplier id.'),
      purchasingOrganization: z.string().optional().describe('Purchasing organization.'),
      companyCode: z.string().optional().describe('Company code.'),
      createdSince: z
        .string()
        .optional()
        .describe('Return purchase orders created on or after this date.'),
      expandItems: z.boolean().optional().describe('Expand purchase order items.'),
      ...pageInputSchema
    })
  )
  .output(
    z.object({
      purchaseOrders: z.array(purchaseOrderSchema).describe('Purchase orders.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    ensureFilteredQuery(
      ctx.input,
      {
        purchaseOrder: ctx.input.purchaseOrder,
        supplier: ctx.input.supplier,
        purchasingOrganization: ctx.input.purchasingOrganization,
        companyCode: ctx.input.companyCode,
        createdSince: ctx.input.createdSince
      },
      'purchase order'
    );

    let client = createClient(ctx);
    let result = await client.queryEntitySet<Record<string, unknown>>({
      serviceName,
      entitySet: 'A_PurchaseOrder',
      pageToken: ctx.input.skipToken,
      query: {
        $top: topValue(ctx.input),
        $filter: buildPurchaseOrderFilters(ctx.input) || undefined,
        $orderby: ctx.input.orderBy,
        $expand: ctx.input.expandItems ? 'to_PurchaseOrderItem' : undefined
      }
    });
    let purchaseOrders = result.items.map(mapPurchaseOrder);

    return {
      output: {
        purchaseOrders,
        page: pageSummary(ctx.input, purchaseOrders.length, result.nextPageToken)
      },
      message: `Retrieved **${purchaseOrders.length}** SAP S/4HANA purchase order(s).`
    };
  })
  .build();

export let getPurchaseOrder = SlateTool.create(spec, {
  name: 'Get Purchase Order',
  key: 'get_purchase_order',
  description:
    'Retrieve a SAP S/4HANA purchase order by id, including item lines where authorized.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      purchaseOrder: z.string().min(1).describe('SAP purchase order id.')
    })
  )
  .output(
    z.object({
      purchaseOrder: purchaseOrderSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let purchaseOrder = await client.getEntity<Record<string, unknown>>({
      serviceName,
      entitySet: 'A_PurchaseOrder',
      key: ctx.input.purchaseOrder,
      query: {
        $expand: 'to_PurchaseOrderItem'
      }
    });
    let mapped = mapPurchaseOrder(purchaseOrder);

    return {
      output: {
        purchaseOrder: mapped
      },
      message: `Retrieved SAP S/4HANA purchase order **${mapped.purchaseOrder ?? ctx.input.purchaseOrder}**.`
    };
  })
  .build();
