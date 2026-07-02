import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkStoreStock = SlateTool.create(spec, {
  name: 'Check Store Stock',
  key: 'check_store_stock',
  description: `Check in-store stock availability for a Target product at nearby stores. Returns up to 20 stores within 50 miles of the specified zipcode, with stock level and store details (address, phone, distance).`,
  instructions: [
    'Provide exactly one product identifier: tcin, dpci, gtin, or url.',
    'A storeStockZipcode is required to find nearby stores.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tcin: z.string().optional().describe('Target TCIN (item ID).'),
      dpci: z.string().optional().describe('Target DPCI code.'),
      gtin: z.string().optional().describe('GTIN, UPC, or ISBN.'),
      url: z
        .string()
        .optional()
        .describe('Target product page URL. Overrides other identifiers.'),
      storeStockZipcode: z.string().describe('US zipcode to search for nearby Target stores.'),
      onlyInStock: z
        .boolean()
        .optional()
        .describe('Only return stores that have the item in stock.')
    })
  )
  .output(
    z.object({
      storeStockResults: z
        .array(z.any())
        .describe(
          'Array of nearby stores with stock status, level, address, phone, and distance.'
        ),
      product: z
        .any()
        .optional()
        .describe('Product identifiers (tcin, dpci) for the queried item.'),
      requestInfo: z.any().optional().describe('Request metadata including credits used.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      store_stock_zipcode: ctx.input.storeStockZipcode
    };
    if (ctx.input.tcin) params.tcin = ctx.input.tcin;
    if (ctx.input.dpci) params.dpci = ctx.input.dpci;
    if (ctx.input.gtin) params.gtin = ctx.input.gtin;
    if (ctx.input.url) params.url = ctx.input.url;
    if (ctx.input.onlyInStock !== undefined) params.only_in_stock = ctx.input.onlyInStock;

    let data = await client.getStoreStock(params);

    let storeCount = data.store_stock_results?.length ?? 0;
    let inStockCount = data.store_stock_results?.filter((s: any) => s.in_stock).length ?? 0;

    return {
      output: {
        storeStockResults: data.store_stock_results ?? [],
        product: data.product,
        requestInfo: data.request_info
      },
      message: `Found **${storeCount}** nearby stores, **${inStockCount}** with stock available near zipcode ${ctx.input.storeStockZipcode}.`
    };
  })
  .build();
