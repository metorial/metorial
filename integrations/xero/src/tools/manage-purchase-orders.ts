import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let lineItemSchema = z.object({
  description: z.string().optional().describe('Description'),
  quantity: z.number().optional().describe('Quantity'),
  unitAmount: z.number().optional().describe('Unit price'),
  accountCode: z.string().optional().describe('Account code'),
  taxType: z.string().optional().describe('Tax type code'),
  itemCode: z.string().optional().describe('Item code'),
  discountRate: z.number().optional().describe('Discount percentage')
});

let purchaseOrderOutputSchema = z.object({
  purchaseOrderId: z.string().optional().describe('Unique Xero purchase order ID'),
  purchaseOrderNumber: z.string().optional().describe('Purchase order number'),
  date: z.string().optional().describe('Purchase order date'),
  deliveryDate: z.string().optional().describe('Expected delivery date'),
  deliveryAddress: z.string().optional().describe('Delivery address'),
  reference: z.string().optional().describe('Reference'),
  status: z
    .string()
    .optional()
    .describe('Status: DRAFT, SUBMITTED, AUTHORISED, BILLED, DELETED'),
  contactName: z.string().optional().describe('Supplier contact name'),
  contactId: z.string().optional().describe('Supplier contact ID'),
  subTotal: z.number().optional().describe('Subtotal'),
  totalTax: z.number().optional().describe('Total tax'),
  total: z.number().optional().describe('Total amount'),
  currencyCode: z.string().optional().describe('Currency code'),
  sentToContact: z.boolean().optional().describe('Whether PO has been sent to supplier'),
  updatedDate: z.string().optional().describe('Last updated timestamp')
});

let mapPurchaseOrder = (po: any) => ({
  purchaseOrderId: po.PurchaseOrderID,
  purchaseOrderNumber: po.PurchaseOrderNumber,
  date: po.DateString || po.Date,
  deliveryDate: po.DeliveryDateString || po.DeliveryDate,
  deliveryAddress: po.DeliveryAddress,
  reference: po.Reference,
  status: po.Status,
  contactName: po.Contact?.Name,
  contactId: po.Contact?.ContactID,
  subTotal: po.SubTotal,
  totalTax: po.TotalTax,
  total: po.Total,
  currencyCode: po.CurrencyCode,
  sentToContact: po.SentToContact,
  updatedDate: po.UpdatedDateUTC
});

export let createPurchaseOrder = SlateTool.create(spec, {
  name: 'Create Purchase Order',
  key: 'create_purchase_order',
  description: `Creates a new purchase order for a supplier in Xero. Specify the supplier contact, line items, delivery details, and dates. Created in DRAFT status by default.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      contactId: z.string().describe('Supplier contact ID'),
      lineItems: z.array(lineItemSchema).min(1).describe('Line items for the purchase order'),
      date: z.string().optional().describe('Purchase order date (YYYY-MM-DD)'),
      deliveryDate: z.string().optional().describe('Expected delivery date (YYYY-MM-DD)'),
      deliveryAddress: z.string().optional().describe('Delivery address'),
      deliveryInstructions: z.string().optional().describe('Delivery instructions'),
      reference: z.string().optional().describe('Reference or PO number'),
      status: z
        .enum(['DRAFT', 'SUBMITTED', 'AUTHORISED'])
        .optional()
        .describe('Initial status'),
      lineAmountTypes: z
        .enum(['Exclusive', 'Inclusive', 'NoTax'])
        .optional()
        .describe('How amounts are calculated'),
      currencyCode: z.string().optional().describe('Currency code'),
      attentionTo: z.string().optional().describe('Attention to field'),
      telephone: z.string().optional().describe('Telephone number')
    })
  )
  .output(purchaseOrderOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let po = await client.createPurchaseOrder({
      Contact: { ContactID: ctx.input.contactId },
      LineItems: ctx.input.lineItems.map(li => ({
        Description: li.description,
        Quantity: li.quantity,
        UnitAmount: li.unitAmount,
        AccountCode: li.accountCode,
        TaxType: li.taxType,
        ItemCode: li.itemCode,
        DiscountRate: li.discountRate
      })),
      Date: ctx.input.date,
      DeliveryDate: ctx.input.deliveryDate,
      DeliveryAddress: ctx.input.deliveryAddress,
      DeliveryInstructions: ctx.input.deliveryInstructions,
      Reference: ctx.input.reference,
      Status: ctx.input.status || 'DRAFT',
      LineAmountTypes: ctx.input.lineAmountTypes,
      CurrencyCode: ctx.input.currencyCode,
      AttentionTo: ctx.input.attentionTo,
      Telephone: ctx.input.telephone
    });

    let output = mapPurchaseOrder(po);

    return {
      output,
      message: `Created purchase order **${output.purchaseOrderNumber || output.purchaseOrderId}** for **${output.total?.toFixed(2)} ${output.currencyCode || ''}** to **${output.contactName}**.`
    };
  })
  .build();

export let listPurchaseOrders = SlateTool.create(spec, {
  name: 'List Purchase Orders',
  key: 'list_purchase_orders',
  description: `Lists purchase orders from Xero with filtering options. Filter by status, date range, or modification time.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starting from 1)'),
      status: z
        .string()
        .optional()
        .describe('Filter by status: DRAFT, SUBMITTED, AUTHORISED, BILLED, DELETED'),
      dateFrom: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return POs modified after this date (ISO 8601)'),
      where: z.string().optional().describe('Xero API where filter expression'),
      order: z.string().optional().describe('Order results')
    })
  )
  .output(
    z.object({
      purchaseOrders: z.array(purchaseOrderOutputSchema).describe('List of purchase orders'),
      count: z.number().describe('Number of purchase orders returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let result = await client.getPurchaseOrders({
      page: ctx.input.page,
      status: ctx.input.status,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      modifiedAfter: ctx.input.modifiedAfter,
      where: ctx.input.where,
      order: ctx.input.order
    });

    let purchaseOrders = (result.PurchaseOrders || []).map(mapPurchaseOrder);

    return {
      output: { purchaseOrders, count: purchaseOrders.length },
      message: `Found **${purchaseOrders.length}** purchase order(s).`
    };
  })
  .build();

export let updatePurchaseOrder = SlateTool.create(spec, {
  name: 'Update Purchase Order',
  key: 'update_purchase_order',
  description: `Updates an existing purchase order. Can modify line items, dates, delivery details, and status (e.g. approve or delete).`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      purchaseOrderId: z.string().describe('The Xero purchase order ID to update'),
      status: z
        .enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'DELETED'])
        .optional()
        .describe('New status'),
      contactId: z.string().optional().describe('New supplier contact ID'),
      lineItems: z.array(lineItemSchema).optional().describe('Replacement line items'),
      date: z.string().optional().describe('New date'),
      deliveryDate: z.string().optional().describe('New delivery date'),
      deliveryAddress: z.string().optional().describe('New delivery address'),
      reference: z.string().optional().describe('New reference')
    })
  )
  .output(purchaseOrderOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let updateData: Record<string, any> = {};
    if (ctx.input.status) updateData.Status = ctx.input.status;
    if (ctx.input.contactId) updateData.Contact = { ContactID: ctx.input.contactId };
    if (ctx.input.date) updateData.Date = ctx.input.date;
    if (ctx.input.deliveryDate) updateData.DeliveryDate = ctx.input.deliveryDate;
    if (ctx.input.deliveryAddress) updateData.DeliveryAddress = ctx.input.deliveryAddress;
    if (ctx.input.reference) updateData.Reference = ctx.input.reference;

    if (ctx.input.lineItems) {
      updateData.LineItems = ctx.input.lineItems.map(li => ({
        Description: li.description,
        Quantity: li.quantity,
        UnitAmount: li.unitAmount,
        AccountCode: li.accountCode,
        TaxType: li.taxType,
        ItemCode: li.itemCode,
        DiscountRate: li.discountRate
      }));
    }

    let po = await client.updatePurchaseOrder(ctx.input.purchaseOrderId, updateData);
    let output = mapPurchaseOrder(po);

    return {
      output,
      message: `Updated purchase order **${output.purchaseOrderNumber || output.purchaseOrderId}** — Status: **${output.status}**.`
    };
  })
  .build();
