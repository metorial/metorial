import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGoodyClient } from '../lib/client';
import { spec } from '../spec';

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

let brandSchema = z.object({
  brandId: z.string().describe('Unique identifier of the brand'),
  name: z.string().describe('Brand name'),
  shippingPrice: z.number().describe('Shipping price in USD cents'),
  freeShippingMinimum: z
    .number()
    .nullable()
    .describe('Minimum order for free shipping in cents')
});

let productSchema = z.object({
  productId: z.string().describe('Unique identifier of the product'),
  name: z.string().describe('Product name'),
  brand: brandSchema.describe('Brand information'),
  subtitle: z.string().nullable().describe('Product subtitle'),
  recipientDescription: z
    .string()
    .nullable()
    .describe('Description shown to the gift recipient'),
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
  variantsLabel: z
    .string()
    .nullable()
    .describe('Label for variant selection (e.g. "Color", "Size")'),
  status: z.string().describe('Product status')
});

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Browse Goody's curated product catalog. Returns products with pricing, images, brand info, and available variants. Supports pagination and filtering by country.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination, starting at 1'),
      perPage: z.number().optional().describe('Items per page (1-100, default 20)'),
      countryCode: z
        .string()
        .optional()
        .describe('Filter products by shipping country code (e.g. "US")')
    })
  )
  .output(
    z.object({
      products: z.array(productSchema).describe('List of products'),
      totalCount: z.number().describe('Total number of products available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createGoodyClient(ctx);

    let result = await client.listProducts({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      countryCode: ctx.input.countryCode
    });

    let products = (result.data || []).map((p: any) => ({
      productId: p.id,
      name: p.name,
      brand: {
        brandId: p.brand?.id,
        name: p.brand?.name,
        shippingPrice: p.brand?.shipping_price,
        freeShippingMinimum: p.brand?.free_shipping_minimum ?? null
      },
      subtitle: p.subtitle ?? null,
      recipientDescription: p.recipient_description ?? null,
      price: p.price,
      priceIsVariable: p.price_is_variable,
      priceMin: p.price_min ?? null,
      priceMax: p.price_max ?? null,
      images: (p.images || []).map((img: any) => ({
        url: img.image_large?.url ?? img.url,
        width: img.image_large?.width ?? img.width,
        height: img.image_large?.height ?? img.height
      })),
      variants: (p.variants || []).map((v: any) => ({
        variantId: v.id,
        name: v.name,
        subtitle: v.subtitle ?? null,
        imageLarge:
          (typeof v.image_large === 'string' ? v.image_large : v.image_large?.url) ?? null
      })),
      variantsLabel: p.variants_label ?? null,
      status: p.status
    }));

    let totalCount = result.list_meta?.total_count || 0;

    return {
      output: { products, totalCount },
      message: `Found **${totalCount}** products. Showing **${products.length}** on this page.`
    };
  })
  .build();
