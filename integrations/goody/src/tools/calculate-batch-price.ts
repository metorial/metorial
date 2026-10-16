import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGoodyClient } from '../lib/client';
import { mailingAddressSchema } from '../lib/schemas';
import { spec } from '../spec';

let recipientInputSchema = z.object({
  firstName: z.string().describe('Recipient first name'),
  lastName: z.string().optional().describe('Recipient last name'),
  email: z.string().optional().describe('Recipient email address'),
  phone: z.string().optional().describe('US phone number in E.164 format'),
  mailingAddress: mailingAddressSchema
    .optional()
    .describe('Address for direct_send pricing; requires approved partner access')
});

let cartItemSchema = z.object({
  productId: z.string().optional().describe('Product ID'),
  productUrl: z.string().optional().describe('Product URL (alternative to productId)'),
  quantity: z.number().describe('Quantity'),
  variablePrice: z.number().optional().describe('Price in cents for flex gifts or gift cards'),
  variants: z
    .array(z.string())
    .optional()
    .describe(
      'Variant names for direct_send pricing; use get_product to discover available names'
    )
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
            .describe('High total estimate for entire batch in USD cents'),
          calculatedTax: z
            .number()
            .nullable()
            .optional()
            .describe('Calculated tax estimate when addresses are supplied, in USD cents'),
          calculatedTotal: z
            .number()
            .nullable()
            .optional()
            .describe('Calculated total estimate when addresses are supplied, in USD cents')
        })
        .describe('Total batch pricing estimate')
    })
  )
  .handleInvocation(async ctx => {
    let client = createGoodyClient(ctx);

    let result = await client.calculateOrderBatchPrice({
      send_method: ctx.input.sendMethod,
      recipients: ctx.input.recipients.map(r => ({
        first_name: r.firstName,
        last_name: r.lastName,
        email: r.email,
        phone: r.phone,
        mailing_address: r.mailingAddress
          ? {
              first_name: r.mailingAddress.firstName,
              last_name: r.mailingAddress.lastName,
              address_1: r.mailingAddress.address1,
              address_2: r.mailingAddress.address2,
              city: r.mailingAddress.city,
              state: r.mailingAddress.state,
              postal_code: r.mailingAddress.postalCode,
              country: r.mailingAddress.country
            }
          : undefined
      })),
      cart: {
        items: ctx.input.cart.map(item => ({
          product_id: item.productId,
          product_url: item.productUrl,
          quantity: item.quantity,
          variable_price: item.variablePrice,
          variants: item.variants
        }))
      }
    });

    let perRecipient = result.cart_price_estimate ?? result.cart_price ?? {};
    let total = result.total_price_estimate ?? result.total_price ?? {};

    return {
      output: {
        perRecipientEstimate: {
          amountProduct: perRecipient.price_product ?? perRecipient.amount_product,
          amountShipping: perRecipient.price_shipping ?? perRecipient.amount_shipping,
          amountProcessingFee:
            perRecipient.price_processing_fee ?? perRecipient.amount_processing_fee ?? null,
          amountPreTaxTotal: perRecipient.price_pre_tax ?? perRecipient.amount_pre_tax_total,
          estimatedTaxLow:
            perRecipient.price_est_tax_low ?? perRecipient.estimated_tax_low ?? null,
          estimatedTaxHigh:
            perRecipient.price_est_tax_high ?? perRecipient.estimated_tax_high ?? null,
          estimatedTotalLow:
            perRecipient.price_est_total_low ?? perRecipient.estimated_total_low ?? null,
          estimatedTotalHigh:
            perRecipient.price_est_total_high ?? perRecipient.estimated_total_high ?? null
        },
        totalEstimate: {
          recipientsCount: total.recipients ?? total.recipients_count,
          estimatedTotalLow: total.est_group_total_low ?? total.estimated_total_low ?? null,
          estimatedTotalHigh: total.est_group_total_high ?? total.estimated_total_high ?? null,
          calculatedTax: total.est_tax_calculated ?? null,
          calculatedTotal: total.est_total_calculated ?? null
        }
      },
      message: `Calculated a price estimate for **${total.recipients ?? total.recipients_count}** recipients. See the returned cost breakdown; estimates can change before fulfillment.`
    };
  })
  .build();
