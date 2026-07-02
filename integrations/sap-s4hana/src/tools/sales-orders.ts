import { SlateTool } from 'slates';
import { z } from 'zod';
import { andFilters, odataDateTimeLiteral, odataStringLiteral } from '../lib/client';
import { spec } from '../spec';
import {
  compactOutput,
  createClient,
  ensureFilteredQuery,
  navigationArray,
  numberValue,
  pageInputSchema,
  pageOutputSchema,
  pageSummary,
  rawRecordSchema,
  stringValue,
  topValue
} from './shared';

const serviceName = 'API_SALES_ORDER_SRV';

let salesOrderItemSchema = z.object({
  salesOrder: z.string().optional().describe('SAP sales order id.'),
  salesOrderItem: z.string().optional().describe('SAP sales order item number.'),
  material: z.string().optional().describe('Material/product id.'),
  requestedQuantity: z.string().optional().describe('Requested quantity.'),
  requestedQuantityUnit: z.string().optional().describe('Requested quantity unit.'),
  netAmount: z.string().optional().describe('Item net amount.'),
  transactionCurrency: z.string().optional().describe('Transaction currency.'),
  record: rawRecordSchema
});

let salesOrderPartnerSchema = z.object({
  partnerFunction: z.string().optional().describe('SAP partner function.'),
  customer: z.string().optional().describe('Customer/business partner id.'),
  supplier: z.string().optional().describe('Supplier/business partner id.'),
  record: rawRecordSchema
});

let salesOrderSchema = z.object({
  salesOrder: z.string().optional().describe('SAP sales order id.'),
  salesOrderType: z.string().optional().describe('Sales order type.'),
  soldToParty: z.string().optional().describe('Sold-to party id.'),
  salesOrganization: z.string().optional().describe('Sales organization.'),
  distributionChannel: z.string().optional().describe('Distribution channel.'),
  division: z.string().optional().describe('Organization division.'),
  overallSDProcessStatus: z.string().optional().describe('Overall SD process status.'),
  overallTotalDeliveryStatus: z.string().optional().describe('Overall delivery status.'),
  totalNetAmount: z.string().optional().describe('Total net amount.'),
  transactionCurrency: z.string().optional().describe('Transaction currency.'),
  purchaseOrderByCustomer: z
    .string()
    .optional()
    .describe('Customer purchase order reference.'),
  createdAt: z.string().optional().describe('Creation date/time.'),
  lastChangedAt: z.string().optional().describe('Last changed timestamp.'),
  items: z.array(salesOrderItemSchema).optional().describe('Expanded sales order items.'),
  partners: z
    .array(salesOrderPartnerSchema)
    .optional()
    .describe('Expanded sales order partners.'),
  record: rawRecordSchema
});

let decimalStringValue = (record: Record<string, unknown>, key: string) => {
  let value = stringValue(record, key);
  if (value !== undefined) return value;

  let numericValue = numberValue(record, key);
  return numericValue === undefined ? undefined : String(numericValue);
};

let mapSalesOrderItem = (item: Record<string, unknown>) => ({
  ...compactOutput({
    salesOrder: stringValue(item, 'SalesOrder'),
    salesOrderItem: stringValue(item, 'SalesOrderItem'),
    material: stringValue(item, 'Material'),
    requestedQuantity: decimalStringValue(item, 'RequestedQuantity'),
    requestedQuantityUnit: stringValue(item, 'RequestedQuantityUnit'),
    netAmount: decimalStringValue(item, 'NetAmount'),
    transactionCurrency: stringValue(item, 'TransactionCurrency')
  }),
  record: item
});

let mapSalesOrderPartner = (partner: Record<string, unknown>) => ({
  ...compactOutput({
    partnerFunction: stringValue(partner, 'PartnerFunction'),
    customer: stringValue(partner, 'Customer'),
    supplier: stringValue(partner, 'Supplier')
  }),
  record: partner
});

export let mapSalesOrder = (order: Record<string, unknown>) => {
  let items = navigationArray(order, 'to_Item').map(mapSalesOrderItem);
  let partners = navigationArray(order, 'to_Partner').map(mapSalesOrderPartner);

  return {
    ...compactOutput({
      salesOrder: stringValue(order, 'SalesOrder'),
      salesOrderType: stringValue(order, 'SalesOrderType'),
      soldToParty: stringValue(order, 'SoldToParty'),
      salesOrganization: stringValue(order, 'SalesOrganization'),
      distributionChannel: stringValue(order, 'DistributionChannel'),
      division: stringValue(order, 'OrganizationDivision'),
      overallSDProcessStatus: stringValue(order, 'OverallSDProcessStatus'),
      overallTotalDeliveryStatus: stringValue(order, 'OverallTotalDeliveryStatus'),
      totalNetAmount: decimalStringValue(order, 'TotalNetAmount'),
      transactionCurrency: stringValue(order, 'TransactionCurrency'),
      purchaseOrderByCustomer: stringValue(order, 'PurchaseOrderByCustomer'),
      createdAt: stringValue(order, 'CreationDate') ?? stringValue(order, 'CreationDateTime'),
      lastChangedAt: stringValue(order, 'LastChangeDateTime'),
      items: items.length > 0 ? items : undefined,
      partners: partners.length > 0 ? partners : undefined
    }),
    record: order
  };
};

let buildSalesOrderFilters = (input: {
  salesOrder?: string;
  soldToParty?: string;
  salesOrganization?: string;
  distributionChannel?: string;
  division?: string;
  createdSince?: string;
  updatedSince?: string;
  status?: string;
}) =>
  andFilters([
    input.salesOrder ? `SalesOrder eq ${odataStringLiteral(input.salesOrder)}` : undefined,
    input.soldToParty ? `SoldToParty eq ${odataStringLiteral(input.soldToParty)}` : undefined,
    input.salesOrganization
      ? `SalesOrganization eq ${odataStringLiteral(input.salesOrganization)}`
      : undefined,
    input.distributionChannel
      ? `DistributionChannel eq ${odataStringLiteral(input.distributionChannel)}`
      : undefined,
    input.division
      ? `OrganizationDivision eq ${odataStringLiteral(input.division)}`
      : undefined,
    input.status ? `OverallSDProcessStatus eq ${odataStringLiteral(input.status)}` : undefined,
    input.createdSince
      ? `CreationDate ge ${odataDateTimeLiteral(input.createdSince, 'datetime')}`
      : undefined,
    input.updatedSince
      ? `LastChangeDateTime ge ${odataDateTimeLiteral(input.updatedSince)}`
      : undefined
  ]);

export let listSalesOrders = SlateTool.create(spec, {
  name: 'List Sales Orders',
  key: 'list_sales_orders',
  description:
    'List SAP S/4HANA sales order headers for order-to-cash discovery, status checks, customer lookup, and sales-area reporting.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      salesOrder: z.string().optional().describe('Exact SAP sales order id.'),
      soldToParty: z.string().optional().describe('Sold-to party/customer id.'),
      salesOrganization: z.string().optional().describe('Sales organization code.'),
      distributionChannel: z.string().optional().describe('Distribution channel code.'),
      division: z.string().optional().describe('Organization division code.'),
      createdSince: z
        .string()
        .optional()
        .describe('Return orders created on or after this date.'),
      updatedSince: z
        .string()
        .optional()
        .describe('Return orders changed on or after this date/datetime.'),
      status: z.string().optional().describe('Overall SD process status code.'),
      expandItems: z
        .boolean()
        .optional()
        .describe('Expand order items and partners for each returned order.'),
      ...pageInputSchema
    })
  )
  .output(
    z.object({
      salesOrders: z.array(salesOrderSchema).describe('Sales orders.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    ensureFilteredQuery(
      ctx.input,
      {
        salesOrder: ctx.input.salesOrder,
        soldToParty: ctx.input.soldToParty,
        salesOrganization: ctx.input.salesOrganization,
        distributionChannel: ctx.input.distributionChannel,
        division: ctx.input.division,
        createdSince: ctx.input.createdSince,
        updatedSince: ctx.input.updatedSince,
        status: ctx.input.status
      },
      'sales order'
    );

    let client = createClient(ctx);
    let result = await client.queryEntitySet<Record<string, unknown>>({
      serviceName,
      entitySet: 'A_SalesOrder',
      pageToken: ctx.input.skipToken,
      query: {
        $top: topValue(ctx.input),
        $filter: buildSalesOrderFilters(ctx.input) || undefined,
        $orderby: ctx.input.orderBy,
        $expand: ctx.input.expandItems ? 'to_Item,to_Partner' : undefined
      }
    });
    let salesOrders = result.items.map(mapSalesOrder);

    return {
      output: {
        salesOrders,
        page: pageSummary(ctx.input, salesOrders.length, result.nextPageToken)
      },
      message: `Retrieved **${salesOrders.length}** SAP S/4HANA sales order(s).`
    };
  })
  .build();

export let getSalesOrder = SlateTool.create(spec, {
  name: 'Get Sales Order',
  key: 'get_sales_order',
  description:
    'Retrieve a SAP S/4HANA sales order by id, including item and partner context where authorized.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      salesOrder: z.string().min(1).describe('SAP sales order id.')
    })
  )
  .output(
    z.object({
      salesOrder: salesOrderSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let order = await client.getEntity<Record<string, unknown>>({
      serviceName,
      entitySet: 'A_SalesOrder',
      key: ctx.input.salesOrder,
      query: {
        $expand: 'to_Item,to_Partner'
      }
    });
    let mapped = mapSalesOrder(order);

    return {
      output: {
        salesOrder: mapped
      },
      message: `Retrieved SAP S/4HANA sales order **${mapped.salesOrder ?? ctx.input.salesOrder}**.`
    };
  })
  .build();
