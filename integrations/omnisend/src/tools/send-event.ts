import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  productId: z.string().optional().describe('Product ID'),
  productTitle: z.string().optional().describe('Product title'),
  productDescription: z.string().optional().describe('Product description'),
  productPrice: z.number().optional().describe('Product price'),
  productQuantity: z.number().optional().describe('Quantity'),
  productSku: z.string().optional().describe('Product SKU'),
  productDiscount: z.number().optional().describe('Discount amount'),
  productUrl: z.string().optional().describe('Product page URL'),
  productImageUrl: z.string().optional().describe('Product image URL'),
  productVariantId: z.string().optional().describe('Variant ID'),
  productVariantTitle: z.string().optional().describe('Variant title'),
  productVendor: z.string().optional().describe('Product vendor'),
  productTags: z.array(z.string()).optional().describe('Product tags'),
  productCategories: z
    .array(
      z.object({
        categoryId: z.string().optional(),
        title: z.string().optional()
      })
    )
    .optional()
    .describe('Product categories')
});

let addressSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    company: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    stateCode: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional()
  })
  .describe('Address details');

export let sendEvent = SlateTool.create(spec, {
  name: 'Send Event',
  key: 'send_event',
  description: `Send a customer event to Omnisend for tracking and automation triggers. Supports predefined ecommerce events (placed order, added to cart, started checkout, etc.) and custom events. Events are used to trigger automations, build segments, and populate reporting.

**Predefined event names:** "placed order", "paid for order", "order fulfilled", "order refunded", "order canceled", "added product to cart", "started checkout", "viewed product", "ordered product"`,
  instructions: [
    'Contact must be identified by email or phone. Anonymous visitors will return a 400 error.',
    'For order events, use eventVersion "v2" and include order properties like totalPrice, lineItems, etc.',
    'Custom event names can be anything (e.g., "trial started", "subscription renewed").'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      eventName: z
        .string()
        .describe(
          'Event name (e.g., "placed order", "added product to cart", or custom name)'
        ),
      eventVersion: z
        .string()
        .optional()
        .describe('Event version (use "v2" for order events)'),
      eventId: z.string().optional().describe('UUID for event deduplication'),
      eventTime: z
        .string()
        .optional()
        .describe('Event timestamp (RFC3339 format, defaults to now)'),
      origin: z.string().optional().describe('Event source identifier (defaults to "api")'),
      contact: z
        .object({
          email: z.string().optional().describe('Contact email'),
          phone: z.string().optional().describe('Contact phone with country code'),
          contactId: z.string().optional().describe('Omnisend contact ID'),
          firstName: z.string().optional().describe('First name'),
          lastName: z.string().optional().describe('Last name'),
          tags: z.array(z.string()).optional().describe('Contact tags'),
          customProperties: z
            .record(z.string(), z.any())
            .optional()
            .describe('Custom contact properties')
        })
        .describe('Contact identification (email or phone required)'),
      properties: z
        .object({
          orderId: z.string().optional().describe('Order ID'),
          orderNumber: z.string().optional().describe('Order number'),
          currency: z.string().optional().describe('Currency code'),
          totalPrice: z
            .number()
            .optional()
            .describe('Total order price (required for order reporting)'),
          subTotalPrice: z.number().optional().describe('Subtotal price'),
          totalDiscount: z.number().optional().describe('Total discount'),
          totalTax: z.number().optional().describe('Total tax'),
          shippingPrice: z.number().optional().describe('Shipping cost'),
          paymentMethod: z.string().optional().describe('Payment method'),
          paymentStatus: z.string().optional().describe('Payment status'),
          fulfillmentStatus: z.string().optional().describe('Fulfillment status'),
          shippingMethod: z.string().optional().describe('Shipping method'),
          orderStatusUrl: z.string().optional().describe('Order status page URL'),
          billingAddress: addressSchema.optional(),
          shippingAddress: addressSchema.optional(),
          lineItems: z.array(lineItemSchema).optional().describe('Order line items'),
          tags: z.array(z.string()).optional().describe('Order tags'),
          note: z.string().optional().describe('Order note'),
          tracking: z
            .object({
              courierTitle: z.string().optional(),
              courierUrl: z.string().optional()
            })
            .optional()
            .describe('Shipping tracking details'),
          cartId: z.string().optional().describe('Cart ID (for cart events)'),
          cartUrl: z.string().optional().describe('Cart recovery URL'),
          productId: z.string().optional().describe('Product ID (for product events)'),
          productTitle: z.string().optional().describe('Product title'),
          productUrl: z.string().optional().describe('Product URL'),
          productImageUrl: z.string().optional().describe('Product image URL'),
          productPrice: z.number().optional().describe('Product price')
        })
        .optional()
        .describe('Event-specific properties'),
      customProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional custom event properties')
    })
  )
  .output(
    z.object({
      accepted: z.boolean().describe('Whether the event was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth.token);

    let contactPayload: Record<string, any> = {};
    if (ctx.input.contact.email) contactPayload.email = ctx.input.contact.email;
    if (ctx.input.contact.phone) contactPayload.phone = ctx.input.contact.phone;
    if (ctx.input.contact.contactId) contactPayload.id = ctx.input.contact.contactId;
    if (ctx.input.contact.firstName) contactPayload.firstName = ctx.input.contact.firstName;
    if (ctx.input.contact.lastName) contactPayload.lastName = ctx.input.contact.lastName;
    if (ctx.input.contact.tags) contactPayload.tags = ctx.input.contact.tags;
    if (ctx.input.contact.customProperties)
      contactPayload.customProperties = ctx.input.contact.customProperties;

    let eventProperties: Record<string, any> = {};
    if (ctx.input.properties) {
      let p = ctx.input.properties;
      if (p.orderId) eventProperties.orderID = p.orderId;
      if (p.orderNumber) eventProperties.orderNumber = p.orderNumber;
      if (p.currency) eventProperties.currency = p.currency;
      if (p.totalPrice !== undefined) eventProperties.totalPrice = p.totalPrice;
      if (p.subTotalPrice !== undefined) eventProperties.subTotalPrice = p.subTotalPrice;
      if (p.totalDiscount !== undefined) eventProperties.totalDiscount = p.totalDiscount;
      if (p.totalTax !== undefined) eventProperties.totalTax = p.totalTax;
      if (p.shippingPrice !== undefined) eventProperties.shippingPrice = p.shippingPrice;
      if (p.paymentMethod) eventProperties.paymentMethod = p.paymentMethod;
      if (p.paymentStatus) eventProperties.paymentStatus = p.paymentStatus;
      if (p.fulfillmentStatus) eventProperties.fulfillmentStatus = p.fulfillmentStatus;
      if (p.shippingMethod) eventProperties.shippingMethod = p.shippingMethod;
      if (p.orderStatusUrl) eventProperties.orderStatusURL = p.orderStatusUrl;
      if (p.billingAddress) eventProperties.billingAddress = p.billingAddress;
      if (p.shippingAddress) eventProperties.shippingAddress = p.shippingAddress;
      if (p.tags) eventProperties.tags = p.tags;
      if (p.note) eventProperties.note = p.note;
      if (p.tracking) eventProperties.tracking = p.tracking;
      if (p.cartId) eventProperties.cartID = p.cartId;
      if (p.cartUrl) eventProperties.cartUrl = p.cartUrl;
      if (p.productId) eventProperties.productID = p.productId;
      if (p.productTitle) eventProperties.productTitle = p.productTitle;
      if (p.productUrl) eventProperties.productURL = p.productUrl;
      if (p.productImageUrl) eventProperties.productImageURL = p.productImageUrl;
      if (p.productPrice !== undefined) eventProperties.productPrice = p.productPrice;

      if (p.lineItems) {
        eventProperties.lineItems = p.lineItems.map(item => {
          let mapped: Record<string, any> = {};
          if (item.productId) mapped.productID = item.productId;
          if (item.productTitle) mapped.productTitle = item.productTitle;
          if (item.productDescription) mapped.productDescription = item.productDescription;
          if (item.productPrice !== undefined) mapped.productPrice = item.productPrice;
          if (item.productQuantity !== undefined)
            mapped.productQuantity = item.productQuantity;
          if (item.productSku) mapped.productSKU = item.productSku;
          if (item.productDiscount !== undefined)
            mapped.productDiscount = item.productDiscount;
          if (item.productUrl) mapped.productURL = item.productUrl;
          if (item.productImageUrl) mapped.productImageURL = item.productImageUrl;
          if (item.productVariantId) mapped.productVariantID = item.productVariantId;
          if (item.productVariantTitle) mapped.productVariantTitle = item.productVariantTitle;
          if (item.productVendor) mapped.productVendor = item.productVendor;
          if (item.productTags) mapped.productTags = item.productTags;
          if (item.productCategories) {
            mapped.productCategories = item.productCategories.map(c => ({
              id: c.categoryId,
              title: c.title
            }));
          }
          return mapped;
        });
      }
    }

    if (ctx.input.customProperties) {
      Object.assign(eventProperties, ctx.input.customProperties);
    }

    let eventPayload = {
      eventName: ctx.input.eventName,
      contact: contactPayload,
      eventVersion: ctx.input.eventVersion,
      eventID: ctx.input.eventId,
      eventTime: ctx.input.eventTime,
      origin: ctx.input.origin,
      properties: Object.keys(eventProperties).length > 0 ? eventProperties : undefined
    };

    await client.sendEvent(eventPayload);

    return {
      output: { accepted: true },
      message: `Event **"${ctx.input.eventName}"** sent for contact ${ctx.input.contact.email || ctx.input.contact.phone || 'unknown'}.`
    };
  })
  .build();
