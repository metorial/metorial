import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve a single product by ID with all details including variants, images, and options.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      productId: z.string().describe('Shopify product ID')
    })
  )
  .output(
    z.object({
      productId: z.string(),
      title: z.string(),
      bodyHtml: z.string().nullable(),
      vendor: z.string(),
      productType: z.string(),
      handle: z.string(),
      status: z.string(),
      tags: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string().nullable(),
      templateSuffix: z.string().nullable(),
      options: z.array(
        z.object({
          optionId: z.string(),
          name: z.string(),
          position: z.number(),
          values: z.array(z.string())
        })
      ),
      variants: z.array(
        z.object({
          variantId: z.string(),
          title: z.string(),
          price: z.string(),
          compareAtPrice: z.string().nullable(),
          sku: z.string().nullable(),
          barcode: z.string().nullable(),
          position: z.number(),
          inventoryQuantity: z.number(),
          inventoryItemId: z.string(),
          weight: z.number().nullable(),
          weightUnit: z.string().nullable(),
          requiresShipping: z.boolean(),
          taxable: z.boolean()
        })
      ),
      images: z.array(
        z.object({
          imageId: z.string(),
          src: z.string(),
          alt: z.string().nullable(),
          position: z.number(),
          width: z.number().nullable(),
          height: z.number().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let p = await client.getProduct(ctx.input.productId);

    return {
      output: {
        productId: String(p.id),
        title: p.title,
        bodyHtml: p.body_html,
        vendor: p.vendor,
        productType: p.product_type,
        handle: p.handle,
        status: p.status,
        tags: p.tags,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        publishedAt: p.published_at,
        templateSuffix: p.template_suffix,
        options: (p.options || []).map((o: any) => ({
          optionId: String(o.id),
          name: o.name,
          position: o.position,
          values: o.values
        })),
        variants: (p.variants || []).map((v: any) => ({
          variantId: String(v.id),
          title: v.title,
          price: v.price,
          compareAtPrice: v.compare_at_price,
          sku: v.sku,
          barcode: v.barcode,
          position: v.position,
          inventoryQuantity: v.inventory_quantity,
          inventoryItemId: String(v.inventory_item_id),
          weight: v.weight,
          weightUnit: v.weight_unit,
          requiresShipping: v.requires_shipping,
          taxable: v.taxable
        })),
        images: (p.images || []).map((img: any) => ({
          imageId: String(img.id),
          src: img.src,
          alt: img.alt,
          position: img.position,
          width: img.width,
          height: img.height
        }))
      },
      message: `Retrieved product **${p.title}** (${p.status}).`
    };
  })
  .build();
