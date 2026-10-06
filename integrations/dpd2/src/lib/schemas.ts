import { z } from 'zod';

// Legacy output names and scalar types remain; absent provider values stay omitted.
const text = z.string().optional();
const number = z.number().optional();
const boolean = z.boolean().optional();
const timestamp = z.number().nullable().optional();
export const storefrontSchema = z.object({
  storefrontId: z.number(),
  name: text,
  url: text,
  contactName: text,
  contactEmail: text,
  currency: text,
  storefrontType: text,
  subdomain: text,
  createdAt: number,
  updatedAt: number
});
export const productSchema = z.object({
  productId: z.number(),
  storefrontId: number,
  name: text,
  description: text,
  longDescription: text,
  price: text,
  sku: text,
  weight: text,
  visibility: number,
  imageFileName: text,
  mimeType: text,
  fileSize: number,
  fileName: text,
  prices: z.array(z.object({ priceId: z.number(), name: text, price: text })).optional(),
  createdAt: number,
  updatedAt: number,
  imageUpdatedAt: number
});
export const customerSummarySchema = z.object({
  customerId: z.number(),
  firstname: text,
  lastname: text,
  email: text
});
export const customerSchema = customerSummarySchema.extend({
  receivesEmail: boolean,
  createdAt: number,
  updatedAt: number
});
export const purchaseSchema = z.object({
  purchaseId: z.number(),
  storefrontId: number,
  status: text,
  currency: text,
  subtotal: text,
  discount: text,
  tax: text,
  shipping: text,
  total: text,
  processorFee: text,
  buyerEmail: text,
  buyerFirstname: text,
  buyerLastname: text,
  ipAddress: text,
  marketingOptin: boolean,
  tangiblesToshIp: number.describe(
    'Legacy field name; omitted when shipping is not applicable.'
  ),
  tangiblesToShip: timestamp.describe(
    'Number of tangible goods to ship; null when shipping is not required.'
  ),
  customer: customerSummarySchema.optional(),
  lineItems: z
    .array(
      z.object({
        lineItemId: number,
        purchaseId: number,
        productId: number,
        productName: text,
        price: text,
        quantity: number,
        downloadLimit: number,
        downloadCount: number,
        expiresAt: timestamp,
        productKeys: z.array(z.string()).optional()
      })
    )
    .optional(),
  customFields: z.array(z.object({ label: text, response: text })).optional(),
  coupons: z
    .array(z.object({ name: text, code: text, discountAmount: text, discountType: text }))
    .optional(),
  createdAt: number,
  updatedAt: number
});
export const subscriptionSchema = z.object({
  subscriptionId: z.number(),
  status: text,
  price: text,
  period: number,
  unit: text,
  taxAmount: text,
  trialTaxAmount: text,
  trialPrice: text,
  trialPeriod: number,
  trialUnit: text,
  createdAt: number,
  updatedAt: number,
  startedAt: number,
  endedAt: timestamp,
  trialStartedAt: timestamp,
  lastPaymentAt: number,
  nextPaymentAt: number
});
export const subscriberSchema = z.object({
  subscriberId: z.number(),
  username: text,
  subscription: subscriptionSchema.optional(),
  createdAt: number,
  updatedAt: number,
  lastLoginAt: timestamp
});
export const pageSchema = {
  page: z.number().optional().describe('The requested 1-based page.'),
  nextPage: z
    .number()
    .optional()
    .describe('Candidate following page; continue until endOfResults is true.'),
  endOfResults: z
    .boolean()
    .optional()
    .describe('True only when DPD returned its documented NOTFOUND sentinel.')
};
