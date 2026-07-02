import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let lineItemSchema = z.object({
  productId: z.string().describe('Unique product identifier'),
  productName: z.string().describe('Name of the product'),
  productKey: z.string().describe('Product key'),
  productPermalink: z.string().describe('Product permalink'),
  quantity: z.number().describe('Quantity purchased'),
  onSale: z.boolean().describe('Whether the product was on sale'),
  couponUsed: z.boolean().describe('Whether a coupon was applied'),
  discountApplied: z.boolean().describe('Whether a discount was applied'),
  affiliateSale: z.boolean().describe('Whether this was an affiliate sale'),
  variant: z.string().nullable().describe('Product variant if applicable')
});

let paymentInputSchema = z.object({
  eventType: z.enum(['paid', 'refunded']).describe('Type of payment event'),
  transactionId: z.string().describe('Transaction identifier'),
  email: z.string().describe('Customer email'),
  currency: z.string().describe('Payment currency'),
  price: z.number().describe('Amount in cents'),
  items: z.array(z.any()).describe('Line items from the payment'),
  paymentType: z.string().describe('Payment method'),
  stripeFee: z.number().nullable().describe('Stripe processing fee in cents'),
  payhipFee: z.number().nullable().describe('Payhip fee in cents'),
  isGift: z.boolean().describe('Whether this was a gift purchase'),
  vatApplied: z.boolean().describe('Whether VAT was applied'),
  date: z.string().describe('Transaction timestamp'),
  amountRefunded: z
    .number()
    .nullable()
    .describe('Refunded amount in cents (for refund events)'),
  dateRefunded: z.string().nullable().describe('Refund timestamp (for refund events)'),
  signature: z.string().describe('HMAC-SHA256 signature for verification')
});

export let paymentTrigger = SlateTrigger.create(spec, {
  name: 'Payment Event',
  key: 'payment_event',
  description:
    'Triggers when a payment is completed or refunded in your Payhip store. Covers both full and partial refunds.'
})
  .input(paymentInputSchema)
  .output(
    z.object({
      transactionId: z.string().describe('Unique transaction identifier'),
      email: z.string().describe('Customer email address'),
      currency: z.string().describe('Payment currency code (e.g. USD)'),
      price: z.number().describe('Total payment amount in cents'),
      items: z.array(lineItemSchema).describe('Products included in the transaction'),
      paymentType: z.string().describe('Payment method used'),
      stripeFee: z.number().nullable().describe('Stripe processing fee in cents'),
      payhipFee: z.number().nullable().describe('Payhip fee in cents'),
      isGift: z.boolean().describe('Whether the purchase was a gift'),
      vatApplied: z.boolean().describe('Whether VAT was applied'),
      date: z.string().describe('Transaction date as Unix timestamp'),
      amountRefunded: z
        .number()
        .nullable()
        .describe('Refunded amount in cents (null if not a refund)'),
      dateRefunded: z
        .string()
        .nullable()
        .describe('Refund date as Unix timestamp (null if not a refund)'),
      isPartialRefund: z
        .boolean()
        .describe(
          'Whether this is a partial refund (false for full refunds and non-refund events)'
        )
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let eventType = data.type as string;

      if (eventType !== 'paid' && eventType !== 'refunded') {
        return { inputs: [] };
      }

      let items = Array.isArray(data.items) ? data.items : [];

      return {
        inputs: [
          {
            eventType: eventType as 'paid' | 'refunded',
            transactionId: String(data.id ?? ''),
            email: String(data.email ?? ''),
            currency: String(data.currency ?? ''),
            price: Number(data.price ?? 0),
            items,
            paymentType: String(data.payment_type ?? ''),
            stripeFee: data.stripe_fee != null ? Number(data.stripe_fee) : null,
            payhipFee: data.payhip_fee != null ? Number(data.payhip_fee) : null,
            isGift: Boolean(data.is_gift),
            vatApplied: Boolean(data.vat_applied),
            date: String(data.date ?? ''),
            amountRefunded: data.amount_refunded != null ? Number(data.amount_refunded) : null,
            dateRefunded: data.date_refunded != null ? String(data.date_refunded) : null,
            signature: String(data.signature ?? '')
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      let mappedItems = (input.items ?? []).map((item: any) => ({
        productId: String(item.product_id ?? ''),
        productName: String(item.product_name ?? ''),
        productKey: String(item.product_key ?? ''),
        productPermalink: String(item.product_permalink ?? ''),
        quantity: Number(item.quantity ?? 1),
        onSale: Boolean(item.on_sale),
        couponUsed: Boolean(item.coupon ?? item.coupon_used),
        discountApplied: Boolean(item.discount ?? item.discount_applied),
        affiliateSale: Boolean(item.affiliate ?? item.affiliate_sale),
        variant: item.variant != null ? String(item.variant) : null
      }));

      let isPartialRefund =
        input.eventType === 'refunded' &&
        input.amountRefunded != null &&
        input.amountRefunded < input.price;

      return {
        type: input.eventType === 'paid' ? 'payment.completed' : 'payment.refunded',
        id: `${input.transactionId}-${input.eventType}${input.dateRefunded ? `-${input.dateRefunded}` : ''}`,
        output: {
          transactionId: input.transactionId,
          email: input.email,
          currency: input.currency,
          price: input.price,
          items: mappedItems,
          paymentType: input.paymentType,
          stripeFee: input.stripeFee,
          payhipFee: input.payhipFee,
          isGift: input.isGift,
          vatApplied: input.vatApplied,
          date: input.date,
          amountRefunded: input.amountRefunded,
          dateRefunded: input.dateRefunded,
          isPartialRefund
        }
      };
    }
  })
  .build();
