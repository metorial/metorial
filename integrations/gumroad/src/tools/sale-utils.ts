import { z } from 'zod';

export let saleSummaryFields = {
  saleId: z.string().describe('Unique sale ID'),
  email: z.string().optional().describe('Buyer email address'),
  sellerEmail: z.string().optional().describe('Seller email address'),
  sellerId: z.string().optional().describe('Seller user ID'),
  productId: z.string().optional().describe('Product ID'),
  productName: z.string().optional().describe('Product name'),
  priceCents: z.number().optional().describe('Sale price in the smallest unit of currency'),
  currency: z.string().optional().describe('Currency code the sale is denominated in'),
  quantity: z.number().optional().describe('Quantity purchased'),
  refunded: z.boolean().optional().describe('Whether the sale was fully refunded'),
  partiallyRefunded: z
    .boolean()
    .optional()
    .describe('Whether the sale was partially refunded'),
  disputed: z.boolean().optional().describe('Whether the sale is disputed'),
  accessRevoked: z
    .boolean()
    .optional()
    .describe("Whether the buyer's access to the purchase has been revoked"),
  subscriptionId: z
    .string()
    .optional()
    .describe('Subscription ID when the sale belongs to a membership'),
  createdAt: z.string().optional().describe('Sale creation timestamp'),
  orderNumber: z
    .number()
    .optional()
    .describe('Numeric order ID, accepted by the orderId filter of list_sales')
};

export let mapSaleSummary = (s: any) => ({
  saleId: s.id,
  email: s.email || undefined,
  sellerEmail: s.seller_email || undefined,
  sellerId: s.seller_id || undefined,
  productId: s.product_id || undefined,
  productName: s.product_name || undefined,
  priceCents: s.price ?? undefined,
  currency: s.currency || undefined,
  quantity: s.quantity ?? undefined,
  refunded: s.refunded ?? undefined,
  partiallyRefunded: s.partially_refunded ?? undefined,
  disputed: s.disputed ?? undefined,
  accessRevoked: s.access_revoked ?? undefined,
  subscriptionId: s.subscription_id || undefined,
  createdAt: s.created_at || undefined,
  orderNumber: s.order_id ?? s.order_number ?? undefined
});
