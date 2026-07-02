import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Create a new order in BaseLinker. Requires order status, currency, payment details, and at least one product. Optionally set delivery and invoice addresses, buyer information, and custom fields.`,
  instructions: [
    'Use getOrderStatusList (via Get Order Statuses tool) to find valid status IDs before creating an order.',
    'The dateAdd field should be a unix timestamp in seconds.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderStatusId: z
        .number()
        .describe(
          'Order status ID (retrieve available statuses with the Get Order Statuses tool)'
        ),
      dateAdd: z.number().describe('Order creation date as unix timestamp'),
      currency: z.string().describe('3-letter currency code, e.g. "EUR", "USD", "PLN"'),
      paymentMethod: z
        .string()
        .describe('Payment method name, e.g. "PayPal", "Bank Transfer"'),
      paymentMethodCod: z.boolean().describe('Whether payment is cash on delivery'),
      paid: z.boolean().describe('Whether the order is already paid'),
      userComments: z.string().optional().describe('Buyer comments'),
      adminComments: z.string().optional().describe('Seller/admin comments'),
      email: z.string().optional().describe('Buyer email address'),
      phone: z.string().optional().describe('Buyer phone number'),
      userLogin: z.string().optional().describe('Marketplace user login'),
      deliveryMethod: z.string().optional().describe('Delivery/shipping method name'),
      deliveryPrice: z.number().optional().describe('Gross delivery price'),
      deliveryFullname: z.string().optional().describe('Recipient full name'),
      deliveryCompany: z.string().optional().describe('Recipient company name'),
      deliveryAddress: z.string().optional().describe('Delivery street and number'),
      deliveryPostcode: z.string().optional().describe('Delivery postcode'),
      deliveryCity: z.string().optional().describe('Delivery city'),
      deliveryState: z.string().optional().describe('Delivery state/province'),
      deliveryCountryCode: z
        .string()
        .optional()
        .describe('Delivery country code (two-letter, e.g. "US")'),
      invoiceFullname: z.string().optional().describe('Invoice recipient name'),
      invoiceCompany: z.string().optional().describe('Invoice company name'),
      invoiceNip: z.string().optional().describe('Invoice tax number / VAT Reg. no.'),
      invoiceAddress: z.string().optional().describe('Invoice street and number'),
      invoicePostcode: z.string().optional().describe('Invoice postcode'),
      invoiceCity: z.string().optional().describe('Invoice city'),
      invoiceCountryCode: z.string().optional().describe('Invoice country code (two-letter)'),
      wantInvoice: z.boolean().optional().describe('Whether the customer wants an invoice'),
      extraField1: z.string().optional().describe('Custom extra field 1'),
      extraField2: z.string().optional().describe('Custom extra field 2'),
      products: z
        .array(
          z.object({
            storage: z
              .string()
              .optional()
              .describe('Product source type: "db" (BaseLinker), "shop", or "warehouse"'),
            storageId: z.string().optional().describe('Storage identifier'),
            productId: z.string().optional().describe('Product ID in the source storage'),
            variantId: z.string().optional().describe('Product variant ID'),
            name: z.string().describe('Product name'),
            sku: z.string().optional().describe('Product SKU'),
            ean: z.string().optional().describe('Product EAN'),
            priceBrutto: z.number().describe('Single item gross price'),
            taxRate: z.number().describe('VAT tax rate (0-100)'),
            quantity: z.number().describe('Quantity'),
            weight: z.number().optional().describe('Single item weight in kg')
          })
        )
        .describe('Order products (at least one required)')
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('ID of the created order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    let result = await client.addOrder({
      orderStatusId: ctx.input.orderStatusId,
      dateAdd: ctx.input.dateAdd,
      currency: ctx.input.currency,
      paymentMethod: ctx.input.paymentMethod,
      paymentMethodCod: ctx.input.paymentMethodCod,
      paid: ctx.input.paid,
      userComments: ctx.input.userComments,
      adminComments: ctx.input.adminComments,
      email: ctx.input.email,
      phone: ctx.input.phone,
      userLogin: ctx.input.userLogin,
      deliveryMethod: ctx.input.deliveryMethod,
      deliveryPrice: ctx.input.deliveryPrice,
      deliveryFullname: ctx.input.deliveryFullname,
      deliveryCompany: ctx.input.deliveryCompany,
      deliveryAddress: ctx.input.deliveryAddress,
      deliveryPostcode: ctx.input.deliveryPostcode,
      deliveryCity: ctx.input.deliveryCity,
      deliveryState: ctx.input.deliveryState,
      deliveryCountryCode: ctx.input.deliveryCountryCode,
      invoiceFullname: ctx.input.invoiceFullname,
      invoiceCompany: ctx.input.invoiceCompany,
      invoiceNip: ctx.input.invoiceNip,
      invoiceAddress: ctx.input.invoiceAddress,
      invoicePostcode: ctx.input.invoicePostcode,
      invoiceCity: ctx.input.invoiceCity,
      invoiceCountryCode: ctx.input.invoiceCountryCode,
      wantInvoice: ctx.input.wantInvoice,
      extraField1: ctx.input.extraField1,
      extraField2: ctx.input.extraField2,
      products: ctx.input.products
    });

    return {
      output: { orderId: result.order_id },
      message: `Created order **#${result.order_id}** with ${ctx.input.products.length} product(s) in ${ctx.input.currency}.`
    };
  })
  .build();
