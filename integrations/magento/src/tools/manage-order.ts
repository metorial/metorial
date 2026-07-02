import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

let orderItemSchema = z.object({
  orderItemId: z.number().optional().describe('Order item entity ID'),
  sku: z.string().optional().describe('Product SKU'),
  name: z.string().optional().describe('Product name'),
  qtyOrdered: z.number().optional().describe('Quantity ordered'),
  qtyShipped: z.number().optional().describe('Quantity shipped'),
  qtyInvoiced: z.number().optional().describe('Quantity invoiced'),
  qtyRefunded: z.number().optional().describe('Quantity refunded'),
  price: z.number().optional().describe('Item price'),
  rowTotal: z.number().optional().describe('Row total'),
  taxAmount: z.number().optional().describe('Tax amount'),
  discountAmount: z.number().optional().describe('Discount amount'),
  productType: z.string().optional().describe('Product type')
});

let orderOutputSchema = z.object({
  orderId: z.number().optional().describe('Order entity ID'),
  incrementId: z.string().optional().describe('Human-readable order number'),
  state: z
    .string()
    .optional()
    .describe('Order state (new, processing, complete, closed, canceled, holded)'),
  status: z.string().optional().describe('Order status'),
  grandTotal: z.number().optional().describe('Order grand total'),
  subtotal: z.number().optional().describe('Order subtotal'),
  taxAmount: z.number().optional().describe('Tax amount'),
  discountAmount: z.number().optional().describe('Discount amount'),
  shippingAmount: z.number().optional().describe('Shipping amount'),
  totalQtyOrdered: z.number().optional().describe('Total quantity ordered'),
  customerEmail: z.string().optional().describe('Customer email'),
  customerFirstname: z.string().optional().describe('Customer first name'),
  customerLastname: z.string().optional().describe('Customer last name'),
  customerId: z.number().optional().describe('Customer ID'),
  currencyCode: z.string().optional().describe('Order currency code'),
  createdAt: z.string().optional().describe('Order creation timestamp'),
  updatedAt: z.string().optional().describe('Order last update timestamp'),
  items: z.array(orderItemSchema).optional().describe('Order line items')
});

let mapOrder = (o: any) => ({
  orderId: o.entity_id,
  incrementId: o.increment_id,
  state: o.state,
  status: o.status,
  grandTotal: o.grand_total,
  subtotal: o.subtotal,
  taxAmount: o.tax_amount,
  discountAmount: o.discount_amount,
  shippingAmount: o.shipping_amount,
  totalQtyOrdered: o.total_qty_ordered,
  customerEmail: o.customer_email,
  customerFirstname: o.customer_firstname,
  customerLastname: o.customer_lastname,
  customerId: o.customer_id,
  currencyCode: o.order_currency_code,
  createdAt: o.created_at,
  updatedAt: o.updated_at,
  items: o.items?.map((i: any) => ({
    orderItemId: i.item_id,
    sku: i.sku,
    name: i.name,
    qtyOrdered: i.qty_ordered,
    qtyShipped: i.qty_shipped,
    qtyInvoiced: i.qty_invoiced,
    qtyRefunded: i.qty_refunded,
    price: i.price,
    rowTotal: i.row_total,
    taxAmount: i.tax_amount,
    discountAmount: i.discount_amount,
    productType: i.product_type
  }))
});

export let manageOrder = SlateTool.create(spec, {
  name: 'Manage Order',
  key: 'manage_order',
  description: `Retrieve order details or perform order actions including adding comments, cancelling, holding, and unholding orders. Use the order entity ID (not the increment ID) for all operations.`,
  instructions: [
    'To **get** an order, provide the orderId.',
    'To **add a comment**, provide orderId, set action to "comment", and include commentText.',
    'To **cancel** an order, set action to "cancel".',
    'To **hold** or **unhold**, set action to "hold" or "unhold" respectively.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'comment', 'cancel', 'hold', 'unhold'])
        .describe('Action to perform on the order'),
      orderId: z.number().describe('Order entity ID'),
      commentText: z.string().optional().describe('Comment text (for comment action)'),
      commentStatus: z.string().optional().describe('Order status to set with the comment'),
      commentVisibleOnFront: z
        .boolean()
        .optional()
        .describe('Whether the comment is visible to the customer')
    })
  )
  .output(
    z.object({
      order: orderOutputSchema.optional().describe('Order details (for get action)'),
      success: z.boolean().optional().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagentoClient({
      storeUrl: ctx.config.storeUrl,
      storeCode: ctx.config.storeCode,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'get') {
      let order = await client.getOrder(ctx.input.orderId);
      return {
        output: { order: mapOrder(order) },
        message: `Retrieved order **#${order.increment_id}** (status: ${order.status}).`
      };
    }

    if (ctx.input.action === 'comment') {
      if (!ctx.input.commentText) {
        throw new Error('commentText is required for the comment action');
      }
      await client.addOrderComment(
        ctx.input.orderId,
        ctx.input.commentText,
        ctx.input.commentStatus,
        ctx.input.commentVisibleOnFront
      );
      return {
        output: { success: true },
        message: `Added comment to order \`${ctx.input.orderId}\`.`
      };
    }

    if (ctx.input.action === 'cancel') {
      await client.cancelOrder(ctx.input.orderId);
      return {
        output: { success: true },
        message: `Cancelled order \`${ctx.input.orderId}\`.`
      };
    }

    if (ctx.input.action === 'hold') {
      await client.holdOrder(ctx.input.orderId);
      return {
        output: { success: true },
        message: `Placed order \`${ctx.input.orderId}\` on hold.`
      };
    }

    // unhold
    await client.unholdOrder(ctx.input.orderId);
    return {
      output: { success: true },
      message: `Released hold on order \`${ctx.input.orderId}\`.`
    };
  })
  .build();
