import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

let orderProductSchema = z.object({
  orderProductId: z.number().describe('Order item ID from BaseLinker'),
  storage: z.string().describe('Product source storage type: "db", "shop", or "warehouse"'),
  storageId: z.number().describe('Storage identifier'),
  productId: z.string().describe('Product ID in BaseLinker or shop storage'),
  variantId: z.string().describe('Product variant ID'),
  name: z.string().describe('Product name'),
  sku: z.string().describe('Product SKU'),
  ean: z.string().describe('Product EAN'),
  location: z.string().describe('Product location'),
  warehouseId: z.number().describe('Source warehouse ID'),
  attributes: z.string().describe('Detailed product attributes, e.g. "Colour: blue"'),
  priceBrutto: z.number().describe('Single item gross price'),
  taxRate: z.number().describe('VAT tax rate'),
  quantity: z.number().describe('Quantity of pieces'),
  weight: z.number().describe('Single item weight')
});

let orderSchema = z.object({
  orderId: z.number().describe('Order ID from BaseLinker order manager'),
  shopOrderId: z.number().describe('Order ID given by the store'),
  externalOrderId: z.string().describe('External order identifier'),
  orderSource: z.string().describe('Order source: "shop", "personal", or marketplace code'),
  orderSourceId: z.number().describe('Unique source identifier'),
  orderSourceInfo: z.string().describe('Order source description'),
  orderStatusId: z.number().describe('Current status identifier'),
  confirmed: z.boolean().describe('Whether the order is confirmed'),
  dateAdd: z.number().describe('Order creation date as unix timestamp'),
  dateConfirmed: z.number().describe('Order confirmation date as unix timestamp'),
  dateInStatus: z.number().describe('Date the order entered current status as unix timestamp'),
  currency: z.string().describe('3-letter currency code'),
  paymentMethod: z.string().describe('Payment method name'),
  paymentMethodCod: z.string().describe('"1" if COD, "0" otherwise'),
  paymentDone: z.number().describe('Amount already paid'),
  email: z.string().describe('Buyer email address'),
  phone: z.string().describe('Buyer phone number'),
  userLogin: z.string().describe('Marketplace user login'),
  userComments: z.string().describe('Buyer comments'),
  adminComments: z.string().describe('Seller comments'),
  deliveryMethod: z.string().describe('Delivery method name'),
  deliveryPrice: z.number().describe('Gross delivery price'),
  deliveryFullname: z.string().describe('Delivery recipient name'),
  deliveryCompany: z.string().describe('Delivery company'),
  deliveryAddress: z.string().describe('Delivery street and number'),
  deliveryPostcode: z.string().describe('Delivery postcode'),
  deliveryCity: z.string().describe('Delivery city'),
  deliveryState: z.string().describe('Delivery state/province'),
  deliveryCountryCode: z.string().describe('Delivery country code (two-letter)'),
  invoiceFullname: z.string().describe('Invoice name'),
  invoiceCompany: z.string().describe('Invoice company'),
  invoiceNip: z.string().describe('Invoice tax number'),
  invoiceAddress: z.string().describe('Invoice street and number'),
  invoicePostcode: z.string().describe('Invoice postcode'),
  invoiceCity: z.string().describe('Invoice city'),
  invoiceCountryCode: z.string().describe('Invoice country code'),
  wantInvoice: z.string().describe('"1" if customer wants invoice, "0" otherwise'),
  extraField1: z.string().describe('Custom extra field 1'),
  extraField2: z.string().describe('Custom extra field 2'),
  orderPage: z.string().describe('Order information page URL'),
  pickState: z.number().describe('Product collection status (1=collected, 0=not)'),
  packState: z.number().describe('Product packing status (1=packed, 0=not)'),
  products: z.array(orderProductSchema).describe('Order product items')
});

export let getOrders = SlateTool.create(spec, {
  name: 'Get Orders',
  key: 'get_orders',
  description: `Retrieve orders from BaseLinker. Supports filtering by order ID, date range, status, email, and order source. Returns up to 100 orders per request with full order details including products, delivery, and invoice information. Use \`idFrom\` for pagination through large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.number().optional().describe('Fetch a single specific order by its ID'),
      dateConfirmedFrom: z
        .number()
        .optional()
        .describe('Fetch orders confirmed after this unix timestamp'),
      dateFrom: z
        .number()
        .optional()
        .describe('Fetch orders created after this unix timestamp'),
      idFrom: z
        .number()
        .optional()
        .describe('Fetch orders with ID greater than this value (for pagination)'),
      getUnconfirmedOrders: z
        .boolean()
        .optional()
        .describe('Include unconfirmed orders in results'),
      statusId: z.number().optional().describe('Filter by order status ID'),
      filterEmail: z.string().optional().describe('Filter by buyer email address'),
      filterOrderSource: z
        .string()
        .optional()
        .describe('Filter by order source, e.g. "ebay", "amazon"'),
      filterOrderSourceId: z.number().optional().describe('Filter by order source identifier'),
      includeCustomExtraFields: z
        .boolean()
        .optional()
        .describe('Include custom extra field values')
    })
  )
  .output(
    z.object({
      orders: z.array(orderSchema).describe('List of orders matching the filter criteria')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    let result = await client.getOrders({
      orderId: ctx.input.orderId,
      dateConfirmedFrom: ctx.input.dateConfirmedFrom,
      dateFrom: ctx.input.dateFrom,
      idFrom: ctx.input.idFrom,
      getUnconfirmedOrders: ctx.input.getUnconfirmedOrders,
      statusId: ctx.input.statusId,
      filterEmail: ctx.input.filterEmail,
      filterOrderSource: ctx.input.filterOrderSource,
      filterOrderSourceId: ctx.input.filterOrderSourceId,
      includeCustomExtraFields: ctx.input.includeCustomExtraFields
    });

    let orders = (result.orders || []).map((o: any) => ({
      orderId: o.order_id,
      shopOrderId: o.shop_order_id,
      externalOrderId: o.external_order_id || '',
      orderSource: o.order_source || '',
      orderSourceId: o.order_source_id,
      orderSourceInfo: o.order_source_info || '',
      orderStatusId: o.order_status_id,
      confirmed: !!o.confirmed,
      dateAdd: o.date_add,
      dateConfirmed: o.date_confirmed,
      dateInStatus: o.date_in_status,
      currency: o.currency || '',
      paymentMethod: o.payment_method || '',
      paymentMethodCod: o.payment_method_cod || '0',
      paymentDone: o.payment_done || 0,
      email: o.email || '',
      phone: o.phone || '',
      userLogin: o.user_login || '',
      userComments: o.user_comments || '',
      adminComments: o.admin_comments || '',
      deliveryMethod: o.delivery_method || '',
      deliveryPrice: o.delivery_price || 0,
      deliveryFullname: o.delivery_fullname || '',
      deliveryCompany: o.delivery_company || '',
      deliveryAddress: o.delivery_address || '',
      deliveryPostcode: o.delivery_postcode || '',
      deliveryCity: o.delivery_city || '',
      deliveryState: o.delivery_state || '',
      deliveryCountryCode: o.delivery_country_code || '',
      invoiceFullname: o.invoice_fullname || '',
      invoiceCompany: o.invoice_company || '',
      invoiceNip: o.invoice_nip || '',
      invoiceAddress: o.invoice_address || '',
      invoicePostcode: o.invoice_postcode || '',
      invoiceCity: o.invoice_city || '',
      invoiceCountryCode: o.invoice_country_code || '',
      wantInvoice: o.want_invoice || '0',
      extraField1: o.extra_field_1 || '',
      extraField2: o.extra_field_2 || '',
      orderPage: o.order_page || '',
      pickState: o.pick_state || 0,
      packState: o.pack_state || 0,
      products: (o.products || []).map((p: any) => ({
        orderProductId: p.order_product_id,
        storage: p.storage || '',
        storageId: p.storage_id || 0,
        productId: p.product_id || '',
        variantId: p.variant_id || '',
        name: p.name || '',
        sku: p.sku || '',
        ean: p.ean || '',
        location: p.location || '',
        warehouseId: p.warehouse_id || 0,
        attributes: p.attributes || '',
        priceBrutto: p.price_brutto || 0,
        taxRate: p.tax_rate || 0,
        quantity: p.quantity || 0,
        weight: p.weight || 0
      }))
    }));

    let count = orders.length;
    return {
      output: { orders },
      message: `Retrieved **${count}** order${count !== 1 ? 's' : ''}${ctx.input.orderId ? ` (order #${ctx.input.orderId})` : ''}.`
    };
  })
  .build();
