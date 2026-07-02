import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProductDetails = SlateTool.create(spec, {
  name: 'Get Product Details',
  key: 'get_product_details',
  description: `Retrieve detailed product information and pricing for virtual inventory SKUs. Returns product name, descriptions, images, dimensions, weight, and pricing. Supports up to 25 SKUs per request.`,
  constraints: ['Maximum of 25 SKUs per request'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      items: z
        .array(
          z.object({
            productSku: z.string().describe('Virtual inventory SKU'),
            productQty: z
              .number()
              .int()
              .min(1)
              .max(999)
              .default(1)
              .describe('Quantity for pricing calculation')
          })
        )
        .min(1)
        .max(25)
        .describe('SKUs to look up')
    })
  )
  .output(
    z.object({
      products: z
        .array(
          z.object({
            sku: z.string().describe('Product SKU'),
            productCode: z.string().optional().describe('Product code'),
            name: z.string().optional().describe('Product name'),
            descriptionShort: z.string().optional().describe('Short description'),
            descriptionLong: z.string().optional().describe('Detailed description'),
            monetaryFormat: z.string().optional().describe('Currency format'),
            quantity: z.number().describe('Quantity priced'),
            perItemPrice: z.number().describe('Price per unit'),
            totalPrice: z.number().describe('Total price for quantity'),
            askingPrice: z.number().optional().describe('Listed asking price'),
            imageUrl1: z.string().optional().describe('Product image URL 1'),
            imageUrl2: z.string().optional().describe('Product image URL 2'),
            imageUrl3: z.string().optional().describe('Product image URL 3'),
            imageGuid: z.string().optional().describe('Image GUID'),
            productSize: z
              .object({
                width: z.number().optional().describe('Width'),
                height: z.number().optional().describe('Height'),
                depth: z.number().optional().describe('Depth'),
                ounces: z.number().optional().describe('Weight in ounces'),
                cubicVolume: z.number().optional().describe('Cubic volume'),
                isRigid: z.boolean().optional().describe('Whether the product is rigid')
              })
              .optional()
              .describe('Physical dimensions')
          })
        )
        .describe('Product details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let apiItems = ctx.input.items.map(item => ({
      product_sku: item.productSku,
      product_qty: item.productQty
    }));

    let data = await client.getProductDetails(apiItems);

    if (!data.status?.success) {
      throw new Error(data.status?.message || 'Failed to fetch product details');
    }

    let products = (data.product_list ?? []).map((p: any) => ({
      sku: p.sku ?? '',
      productCode: p.product_code || undefined,
      name: p.name || undefined,
      descriptionShort: p.description_short || undefined,
      descriptionLong: p.description_long || undefined,
      monetaryFormat: p.monetary_format || undefined,
      quantity: p.quantity ?? 0,
      perItemPrice: p.per_item_price ?? 0,
      totalPrice: p.total_price ?? 0,
      askingPrice: p.asking_price || undefined,
      imageUrl1: p.image_url_1 || undefined,
      imageUrl2: p.image_url_2 || undefined,
      imageUrl3: p.image_url_3 || undefined,
      imageGuid: p.image_guid || undefined,
      productSize: p.product_size
        ? {
            width: p.product_size.width,
            height: p.product_size.height,
            depth: p.product_size.depth,
            ounces: p.product_size.ounces,
            cubicVolume: p.product_size.cubic_volume,
            isRigid: p.product_size.is_rigid
          }
        : undefined
    }));

    return {
      output: { products },
      message: `Retrieved details for **${products.length}** product(s). ${products.map((p: any) => `\`${p.sku}\`: ${p.name ?? 'Unknown'} ($${p.perItemPrice.toFixed(2)}/ea)`).join(', ')}`
    };
  })
  .build();
