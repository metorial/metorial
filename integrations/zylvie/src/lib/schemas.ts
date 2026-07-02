import { z } from 'zod';

export let buyerSchema = z.object({
  name: z.string().optional().describe('Full name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  email: z.string().describe('Email address'),
  permissionToSendEmails: z.boolean().optional().describe('Whether they opted in to emails'),
  phone: z.string().optional().describe('Phone number'),
  addressLine1: z.string().optional().describe('Address line 1'),
  addressLine2: z.string().optional().describe('Address line 2'),
  postalCode: z.string().optional().describe('Postal code'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State or region'),
  country: z.string().optional().describe('Country code'),
  paymentMethodType: z.string().optional().describe('Payment method type (e.g. card)'),
  cardBrand: z.string().optional().describe('Card brand (e.g. visa)'),
  cardLast4: z.string().optional().describe('Last 4 digits of card')
});

export let productSchema = z.object({
  productId: z.string().optional().describe('Product ID'),
  title: z.string().describe('Product title'),
  price: z.number().optional().describe('Product price'),
  quantity: z.number().optional().describe('Quantity purchased'),
  pricingModel: z.string().optional().describe('Pricing model'),
  isVariant: z.boolean().optional().describe('Whether this is a variant'),
  tags: z.array(z.string()).optional().describe('Product tags')
});

export let couponSchema = z.object({
  code: z.string().describe('Coupon code'),
  type: z.string().describe('Discount type: percentage or fixed'),
  amount: z.number().describe('Discount amount')
});

export let customFieldSchema = z.object({
  name: z.string().describe('Field name'),
  value: z.string().describe('Field value')
});

export let mapBuyer = (buyer: Record<string, unknown>) => ({
  name: buyer.name as string | undefined,
  firstName: buyer.first_name as string | undefined,
  lastName: buyer.last_name as string | undefined,
  email: buyer.email as string,
  permissionToSendEmails: buyer.permission_to_send_emails as boolean | undefined,
  phone: buyer.phone as string | undefined,
  addressLine1: buyer.line1 as string | undefined,
  addressLine2: buyer.line2 as string | undefined,
  postalCode: buyer.postal_code as string | undefined,
  city: buyer.city as string | undefined,
  state: buyer.state as string | undefined,
  country: buyer.country as string | undefined,
  paymentMethodType: buyer.payment_method_type as string | undefined,
  cardBrand: buyer.card_brand as string | undefined,
  cardLast4: buyer.card_last4 as string | undefined
});

export let mapProduct = (product: Record<string, unknown>) => ({
  productId: product.id as string | undefined,
  title: product.title as string,
  price: product.price as number | undefined,
  quantity: product.quantity as number | undefined,
  pricingModel: product.pricing_model as string | undefined,
  isVariant: product.is_variant as boolean | undefined,
  tags: product.tags as string[] | undefined
});

export let mapCustomFields = (fields: Record<string, unknown>[] | undefined) =>
  (fields || []).map(f => ({
    name: f.name as string,
    value: f.value as string
  }));
