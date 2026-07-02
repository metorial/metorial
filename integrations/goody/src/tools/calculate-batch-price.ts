import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoodyClient } from '../lib/client';
import { spec } from '../spec';

let recipientInputSchema = z.object({
  firstName: z.string().describe('Recipient first name'),
  lastName: z.string().optional().describe('Recipient last name'),
  email: z.string().optional().describe('Recipient email address')
});

let cartItemSchema = z.object({
  productId: z.string().optional().describe('Product ID'),
  productUrl: z.string().optional().describe('Product URL (alternative to productId)'),
  quantity: z.number().describe('Quantity'),
  variablePrice: z.number().optional().describe('Price in cents for flex gifts or gift cards')
});

export let calculateBatchPrice = SlateTool.create(spec, {
  name: 'Calculate Batch Price',
  key: 'calculate_batch_price',
  description: `Calculate the estimated price for an order batch before creating it. Returns per-recipient and total cost estimates including product, shipping, fees, and tax.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sendMethod: z
        .enum(['email_and_link', 'link_multiple_custom_list', 'direct_send'])
        .describe('Delivery method'),
      recipients: z
        .array(recipientInputSchema)
        .min(1)
        .describe('Recipients for pricing calculation'),
      cart: z.array(cartItemSchema).min(1).describe('Products to include')
    })
  )
  .output(
    z.object({
      perRecipientEstimate: z
        .object({
          amountProduct: z.number().describe('Product cost per recipient in USD cents'),
          amountShipping: z.number().describe('Shipping cost per recipient in USD cents'),
          amountProcessingFee: z
            .number()
            .nullable()
            .describe('Processing fee per recipient in USD cents'),
          amountPreTaxTotal: z
            .number()
            .describe('Subtotal before tax per recipient in USD cents'),
          estimatedTaxLow: z
            .number()
            .nullable()
            .describe('Low tax estimate per recipient in USD cents'),
          estimatedTaxHigh: z
            .number()
            .nullable()
            .describe('High tax estimate per recipient in USD cents'),
          estimatedTotalLow: z
            .number()
            .nullable()
            .describe('Low total estimate per recipient in USD cents'),
          estimatedTotalHigh: z
            .number()
            .nullable()
            .describe('High total estimate per recipient in USD cents')
        })
        .describe('Per-recipient pricing estimate'),
      totalEstimate: z
        .object({
          recipientsCount: z.number().describe('Number of recipients'),
          estimatedTotalLow: z
            .number()
            .nullable()
            .describe('Low total estimate for entire batch in USD cents'),
          estimatedTotalHigh: z
            .number()
            .nullable()
            .describe('High total estimate for entire batch in USD cents')
        })
        .describe('Total batch pricing estimate')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoodyClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.calculateOrderBatchPrice({
      send_method: ctx.input.sendMethod,
      recipients: ctx.input.recipients.map(r => ({
        first_name: r.firstName,
        last_name: r.lastName,
        email: r.email
      })),
      cart: {
        items: ctx.input.cart.map(item => ({
          product_id: item.productId,
          product_url: item.productUrl,
          quantity: item.quantity,
          variable_price: item.variablePrice
        }))
      }
    });

    let perRecipient = result.cart_price_estimate || {};
    let total = result.total_price_estimate || {};

    return {
      output: {
        perRecipientEstimate: {
          amountProduct: perRecipient.amount_product,
          amountShipping: perRecipient.amount_shipping,
          amountProcessingFee: perRecipient.amount_processing_fee,
          amountPreTaxTotal: perRecipient.amount_pre_tax_total,
          estimatedTaxLow: perRecipient.estimated_tax_low,
          estimatedTaxHigh: perRecipient.estimated_tax_high,
          estimatedTotalLow: perRecipient.estimated_total_low,
          estimatedTotalHigh: perRecipient.estimated_total_high
        },
        totalEstimate: {
          recipientsCount: total.recipients_count,
          estimatedTotalLow: total.estimated_total_low,
          estimatedTotalHigh: total.estimated_total_high
        }
      },
      message: `Estimated batch price for **${total.recipients_count}** recipients: **$${((total.estimated_total_low || 0) / 100).toFixed(2)}** – **$${((total.estimated_total_high || 0) / 100).toFixed(2)}**.`
    };
  })
  .build();
