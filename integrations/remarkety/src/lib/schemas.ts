import { z } from 'zod';

export let addressSchema = z
  .object({
    country: z.string().optional().describe('Country name'),
    countryCode: z.string().optional().describe('ISO country code (e.g., US)'),
    provinceCode: z.string().optional().describe('Province/state code'),
    region: z.string().optional().describe('Region or state name'),
    city: z.string().optional().describe('City name'),
    street: z.string().optional().describe('Street address'),
    zip: z.string().optional().describe('ZIP/postal code'),
    phone: z.string().optional().describe('Phone number')
  })
  .describe('Address information');

export let customerSchema = z.object({
  customerId: z.string().describe('Unique customer ID, must be consistent across all events'),
  email: z.string().describe('Customer email address'),
  firstName: z.string().optional().describe('Customer first name'),
  lastName: z.string().optional().describe('Customer last name'),
  createdAt: z.string().optional().describe('ISO 8601 datetime when the customer was created'),
  updatedAt: z
    .string()
    .optional()
    .describe('ISO 8601 datetime when the customer was last updated'),
  acceptsMarketing: z
    .boolean()
    .nullable()
    .optional()
    .describe('Whether the customer accepts marketing emails. Null for unknown.'),
  acceptsSmsMarketing: z
    .boolean()
    .optional()
    .describe('Whether the customer accepts SMS marketing'),
  smsPhoneNumber: z
    .string()
    .optional()
    .describe('SMS phone number in E.164 format (e.g., +15417540000)'),
  birthdate: z.string().optional().describe('Customer birthdate in YYYY-MM-DD format'),
  gender: z.string().optional().describe('Customer gender (e.g., M or F)'),
  defaultAddress: addressSchema.optional().describe('Customer default address'),
  tags: z.array(z.string()).optional().describe('Array of tag strings'),
  groups: z
    .array(
      z.object({
        groupId: z.string().describe('Group ID'),
        name: z.string().describe('Group name')
      })
    )
    .optional()
    .describe('Array of group memberships'),
  rewardPoints: z.number().optional().describe('Customer reward points')
});

export let lineItemSchema = z.object({
  productId: z.string().describe('Product ID, should match product catalog'),
  sku: z.string().optional().describe('Product SKU'),
  title: z.string().optional().describe('Product/line item title'),
  variantId: z.string().optional().describe('Variant ID'),
  variantTitle: z.string().optional().describe('Variant title'),
  quantity: z.number().describe('Quantity ordered'),
  price: z.number().describe('Unit price'),
  totalDiscount: z.number().optional().describe('Total discount applied to this line item'),
  imageUrl: z.string().optional().describe('Product image URL'),
  url: z.string().optional().describe('Product page URL')
});

export let discountCodeSchema = z.object({
  code: z.string().describe('Discount code'),
  amount: z.number().describe('Discount amount'),
  type: z.string().optional().describe('Discount type (e.g., fixed_amount, percentage)')
});

export let orderSchema = z.object({
  orderId: z.string().describe('Unique order ID'),
  email: z.string().describe('Customer email on the order'),
  createdAt: z.string().optional().describe('ISO 8601 datetime when the order was created'),
  updatedAt: z.string().optional().describe('ISO 8601 datetime when the order was updated'),
  currency: z.string().optional().describe('Currency code (e.g., USD)'),
  fulfillmentStatus: z.string().optional().describe('Fulfillment status'),
  financialStatus: z
    .string()
    .optional()
    .describe('Financial status (e.g., paid, pending, refunded)'),
  totalPrice: z.number().optional().describe('Total order price'),
  subtotalPrice: z.number().optional().describe('Subtotal price before tax and shipping'),
  totalTax: z.number().optional().describe('Total tax amount'),
  totalShipping: z.number().optional().describe('Total shipping cost'),
  totalDiscounts: z.number().optional().describe('Total discounts applied'),
  billingAddress: addressSchema.optional().describe('Billing address'),
  shippingAddress: addressSchema.optional().describe('Shipping address'),
  customer: customerSchema
    .partial()
    .optional()
    .describe('Customer information associated with the order'),
  discountCodes: z.array(discountCodeSchema).optional().describe('Discount codes applied'),
  lineItems: z.array(lineItemSchema).describe('Order line items'),
  acceptsMarketing: z.boolean().optional().describe('Marketing preference'),
  cartToken: z.string().optional().describe('Cart token identifier'),
  abandonedCheckoutUrl: z.string().optional().describe('Abandoned checkout recovery URL'),
  cancelledAt: z.string().optional().describe('ISO 8601 datetime when the order was cancelled')
});

export let productVariantSchema = z.object({
  variantId: z.string().describe('Variant ID'),
  title: z.string().optional().describe('Variant title'),
  sku: z.string().optional().describe('Variant SKU'),
  price: z.number().optional().describe('Variant price'),
  compareAtPrice: z.number().optional().describe('Compare-at / original price'),
  inventoryQuantity: z.number().optional().describe('Available inventory quantity'),
  imageUrl: z.string().optional().describe('Variant image URL'),
  option1: z.string().optional().describe('First option value (e.g., size)'),
  option2: z.string().optional().describe('Second option value (e.g., color)'),
  option3: z.string().optional().describe('Third option value')
});

export let productSchema = z.object({
  productId: z.string().describe('Unique product ID'),
  title: z.string().describe('Product title'),
  url: z.string().optional().describe('Product page URL'),
  imageUrl: z.string().optional().describe('Product image URL'),
  images: z
    .array(
      z.object({
        imageUrl: z.string().describe('Image URL'),
        position: z.number().optional().describe('Image position/order')
      })
    )
    .optional()
    .describe('Additional product images'),
  price: z.number().optional().describe('Product price'),
  compareAtPrice: z.number().optional().describe('Compare-at / original price'),
  sku: z.string().optional().describe('Product SKU'),
  vendor: z.string().optional().describe('Product vendor'),
  categories: z.array(z.string()).optional().describe('Product category names'),
  tags: z.array(z.string()).optional().describe('Product tags'),
  description: z.string().optional().describe('Product description (HTML allowed)'),
  inventoryQuantity: z.number().optional().describe('Total inventory quantity'),
  createdAt: z.string().optional().describe('ISO 8601 datetime when the product was created'),
  updatedAt: z.string().optional().describe('ISO 8601 datetime when the product was updated'),
  publishedAt: z
    .string()
    .optional()
    .describe('ISO 8601 datetime when the product was published'),
  enabled: z.boolean().optional().describe('Whether the product is enabled/visible'),
  variants: z.array(productVariantSchema).optional().describe('Product variants')
});

export let cartSchema = z.object({
  cartId: z.string().describe('Unique cart ID, must be consistent across updates'),
  email: z.string().nullable().optional().describe('Customer email (null if anonymous cart)'),
  createdAt: z.string().optional().describe('ISO 8601 datetime when the cart was created'),
  updatedAt: z.string().optional().describe('ISO 8601 datetime when the cart was updated'),
  currency: z.string().optional().describe('Currency code (e.g., USD)'),
  totalPrice: z.number().optional().describe('Total cart price'),
  lineItems: z.array(lineItemSchema).describe('Cart line items'),
  customer: customerSchema
    .partial()
    .optional()
    .describe('Customer information (null if anonymous)'),
  abandonedCheckoutUrl: z.string().optional().describe('Abandoned checkout recovery URL'),
  cartToken: z.string().optional().describe('Cart token identifier')
});
