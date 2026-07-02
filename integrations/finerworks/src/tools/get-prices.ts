import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPrices = SlateTool.create(spec, {
  name: 'Get Prices',
  key: 'get_prices',
  description: `Retrieve pricing breakdowns for products by their SKU or product code. Submit up to 50 items at once with quantities to get per-item and total prices including any framing, matting, glazing, and color correction add-ons.`,
  constraints: ['Maximum of 50 items per request', 'Quantity must be between 1 and 999'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      items: z
        .array(
          z.object({
            productSku: z.string().describe('Virtual inventory SKU or product code'),
            productQty: z.number().int().min(1).max(999).describe('Quantity to price')
          })
        )
        .min(1)
        .max(50)
        .describe('Products and quantities to price')
    })
  )
  .output(
    z.object({
      prices: z
        .array(
          z.object({
            productSku: z.string().describe('Requested SKU'),
            productCode: z.string().optional().describe('Resolved product code'),
            productQty: z.number().describe('Quantity priced'),
            productPrice: z.number().describe('Base per-unit price'),
            addFramePrice: z.number().optional().describe('Frame add-on price'),
            addMat1Price: z.number().optional().describe('Mat 1 add-on price'),
            addMat2Price: z.number().optional().describe('Mat 2 add-on price'),
            addGlazingPrice: z.number().optional().describe('Glazing add-on price'),
            addColorCorrectPrice: z
              .number()
              .optional()
              .describe('Color correction add-on price'),
            totalPrice: z.number().describe('Total price for the quantity'),
            info: z.string().optional().describe('Additional pricing information')
          })
        )
        .describe('Pricing results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let data = await client.getPrices(ctx.input.items);

    if (!data.status?.success) {
      throw new Error(data.status?.message || 'Failed to fetch prices');
    }

    let prices = (data.prices ?? []).map((p: any) => ({
      productSku: p.product_sku ?? '',
      productCode: p.product_code || undefined,
      productQty: p.product_qty ?? 0,
      productPrice: p.product_price ?? 0,
      addFramePrice: p.add_frame_price || undefined,
      addMat1Price: p.add_mat_1_price || undefined,
      addMat2Price: p.add_mat_2_price || undefined,
      addGlazingPrice: p.add_glazing_price || undefined,
      addColorCorrectPrice: p.add_color_correct_price || undefined,
      totalPrice: p.total_price ?? 0,
      info: p.info || undefined
    }));

    return {
      output: { prices },
      message: `Priced **${prices.length}** item(s). ${prices.map((p: any) => `\`${p.productSku}\` × ${p.productQty}: $${p.totalPrice.toFixed(2)}`).join(', ')}`
    };
  })
  .build();
