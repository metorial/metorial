import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoodyClient } from '../lib/client';
import { spec } from '../spec';

let productAttributeSchema = z.object({
  label: z.string().describe('Attribute label'),
  content: z.string().describe('Attribute value')
});

let productVariantSchema = z.object({
  variantId: z.string().describe('Unique identifier of the variant'),
  name: z.string().describe('Display name of the variant'),
  subtitle: z.string().nullable().describe('Short subtitle for the variant'),
  imageLarge: z.string().nullable().describe('URL of the large variant image')
});

let productImageSchema = z.object({
  url: z.string().describe('Image URL'),
  width: z.number().describe('Image width in pixels'),
  height: z.number().describe('Image height in pixels')
});

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve detailed information about a specific product including pricing, variants, brand info, images, and product attributes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product to retrieve')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('Unique identifier of the product'),
      name: z.string().describe('Product name'),
      brandName: z.string().describe('Brand name'),
      brandId: z.string().describe('Brand ID'),
      subtitle: z.string().nullable().describe('Product subtitle'),
      subtitleShort: z.string().nullable().describe('Short product subtitle'),
      recipientDescription: z.string().nullable().describe('Description shown to recipient'),
      price: z.number().describe('Product price in USD cents'),
      priceIsVariable: z.boolean().describe('Whether the price can be set by the sender'),
      priceMin: z
        .number()
        .nullable()
        .describe('Minimum price in cents for variable-price products'),
      priceMax: z
        .number()
        .nullable()
        .describe('Maximum price in cents for variable-price products'),
      images: z.array(productImageSchema).describe('Product images'),
      variants: z.array(productVariantSchema).describe('Available product variants'),
      variantsLabel: z.string().nullable().describe('Label for variant selection'),
      variantsNumSelectable: z
        .number()
        .nullable()
        .describe('Number of variants a recipient can select'),
      attributes: z.array(productAttributeSchema).describe('Product attributes'),
      status: z.string().describe('Product status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoodyClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let p = await client.getProduct(ctx.input.productId);

    return {
      output: {
        productId: p.id,
        name: p.name,
        brandName: p.brand?.name,
        brandId: p.brand?.id,
        subtitle: p.subtitle,
        subtitleShort: p.subtitle_short,
        recipientDescription: p.recipient_description,
        price: p.price,
        priceIsVariable: p.price_is_variable,
        priceMin: p.price_min,
        priceMax: p.price_max,
        images: (p.images || []).map((img: any) => ({
          url: img.url,
          width: img.width,
          height: img.height
        })),
        variants: (p.variants || []).map((v: any) => ({
          variantId: v.id,
          name: v.name,
          subtitle: v.subtitle,
          imageLarge: v.image_large
        })),
        variantsLabel: p.variants_label,
        variantsNumSelectable: p.variants_num_selectable,
        attributes: (p.attributes || []).map((a: any) => ({
          label: a.label,
          content: a.content
        })),
        status: p.status
      },
      message: `Retrieved product **${p.name}** from **${p.brand?.name}** — $${(p.price / 100).toFixed(2)}.`
    };
  })
  .build();
