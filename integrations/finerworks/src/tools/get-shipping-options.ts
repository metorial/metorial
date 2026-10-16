import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, requiredArray, requiredNumber, requiredString } from '../lib/client';
import { spec } from '../spec';

let productPricingSchema = z.object({
  productQty: z.number().describe('Quantity'),
  productSku: z.string().describe('Product SKU'),
  productCode: z.string().optional().describe('Product code'),
  productPrice: z.number().describe('Base product price'),
  addFramePrice: z.number().optional().describe('Frame add-on price'),
  addMat1Price: z.number().optional().describe('Mat 1 add-on price'),
  addMat2Price: z.number().optional().describe('Mat 2 add-on price'),
  addGlazingPrice: z.number().optional().describe('Glazing add-on price'),
  totalPrice: z.number().describe('Total line item price')
});

let shippingOptionSchema = z.object({
  shippingId: z
    .number()
    .optional()
    .describe(
      'Shipping option ID; pass its string form as shippingCode when submitting an order'
    ),
  rate: z.number().describe('Shipping rate'),
  shippingMethod: z.string().describe('Shipping method description'),
  shippingCode: z.string().describe('Shipping code to use when submitting orders'),
  calculatedTotal: z
    .object({
      orderPo: z.string().optional().describe('Purchase order reference'),
      orderSubtotal: z.number().describe('Order subtotal before shipping'),
      orderShippingRate: z.number().describe('Shipping cost'),
      orderDiscount: z.number().optional().describe('Discount amount'),
      orderSalesTax: z.number().optional().describe('Sales tax amount'),
      orderSalesTaxRate: z.number().optional().describe('Sales tax rate'),
      orderCreditsUsed: z.number().optional().describe('Credits applied'),
      orderGrandTotal: z.number().describe('Total including shipping and tax'),
      productPricing: z
        .array(productPricingSchema)
        .optional()
        .describe('Per-item pricing breakdown')
    })
    .describe('Full cost breakdown for this shipping option')
});

export let getShippingOptions = SlateTool.create(spec, {
  name: 'Get Shipping Options',
  key: 'get_shipping_options',
  description: `Retrieve available shipping options and pricing for an order. Provide the recipient address and order items to get shipping methods with their costs and full pricing breakdowns. The returned \`shippingCode\` values are used when submitting orders.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderPo: z.string().describe('Purchase order reference'),
      recipient: z
        .object({
          firstName: z.string().describe('Recipient first name'),
          lastName: z.string().describe('Recipient last name'),
          address1: z.string().describe('Primary address line'),
          city: z.string().describe('City'),
          stateCode: z.string().optional().describe('State/province code'),
          zipPostalCode: z.string().describe('Postal/ZIP code'),
          countryCode: z.string().describe('Country code'),
          phone: z.string().optional().describe('Phone number')
        })
        .describe('Recipient address'),
      orderItems: z
        .array(
          z.object({
            productSku: z.string().describe('Product SKU'),
            productQty: z.number().int().min(1).describe('Quantity')
          })
        )
        .min(1)
        .describe('Line items')
    })
  )
  .output(
    z.object({
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response'),
      options: z.array(shippingOptionSchema).describe('Available shipping options')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let orderPayload = {
      order_po: ctx.input.orderPo,
      recipient: {
        first_name: ctx.input.recipient.firstName,
        last_name: ctx.input.recipient.lastName,
        company_name: undefined,
        address_1: ctx.input.recipient.address1,
        address_2: null,
        address_3: null,
        city: ctx.input.recipient.city,
        state_code: ctx.input.recipient.stateCode,
        province: null,
        zip_postal_code: ctx.input.recipient.zipPostalCode,
        country_code: ctx.input.recipient.countryCode,
        phone: ctx.input.recipient.phone,
        email: null,
        address_order_po: ctx.input.orderPo
      },
      order_items: ctx.input.orderItems.map(item => ({
        product_sku: item.productSku,
        product_qty: item.productQty,
        product_title: undefined,
        product_image: null,
        product_guid: undefined,
        product_order_po: ctx.input.orderPo
      })),
      test_mode: ctx.config.testMode
    };

    let data = await client.listShippingOptions(orderPayload);

    let options = requiredArray(data.options, 'options').map((opt: any) => ({
      shippingId: opt.id ?? undefined,
      rate: requiredNumber(opt.rate, 'rate'),
      shippingMethod: requiredString(opt.shipping_method, 'shipping_method'),
      shippingCode: requiredString(opt.shipping_code, 'shipping_code'),
      calculatedTotal: {
        orderPo: opt.calculated_total?.order_po,
        orderSubtotal: requiredNumber(
          opt.calculated_total?.order_subtotal,
          'calculated_total.order_subtotal'
        ),
        orderShippingRate: requiredNumber(
          opt.calculated_total?.order_shipping_rate,
          'calculated_total.order_shipping_rate'
        ),
        orderDiscount: opt.calculated_total?.order_discount,
        orderSalesTax: opt.calculated_total?.order_sales_tax,
        orderSalesTaxRate: opt.calculated_total?.order_sales_tax_rate,
        orderCreditsUsed: opt.calculated_total?.order_credits_used,
        orderGrandTotal: requiredNumber(
          opt.calculated_total?.order_grand_total,
          'calculated_total.order_grand_total'
        ),
        productPricing: opt.calculated_total?.product_pricing?.map((p: any) => ({
          productQty: requiredNumber(p.product_qty, 'product_qty'),
          productSku: requiredString(p.product_sku, 'product_sku'),
          productCode: p.product_code ?? undefined,
          productPrice: requiredNumber(p.product_price, 'product_price'),
          addFramePrice: p.add_frame_price ?? undefined,
          addMat1Price: p.add_mat_1_price ?? undefined,
          addMat2Price: p.add_mat_2_price ?? undefined,
          addGlazingPrice: p.add_glazing_price ?? undefined,
          totalPrice: requiredNumber(p.total_price, 'total_price')
        }))
      }
    }));

    return {
      output: { options, raw: data },
      message: `Found **${options.length}** shipping option(s). ${options.map((o: any) => `${o.shippingMethod} (\`${o.shippingCode}\`): $${o.calculatedTotal.orderGrandTotal.toFixed(2)}`).join(', ')}`
    };
  })
  .build();
