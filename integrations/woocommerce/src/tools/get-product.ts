import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let imageSchema = z.object({
  imageId: z.number(),
  src: z.string(),
  name: z.string(),
  alt: z.string()
});

let attributeSchema = z.object({
  attributeId: z.number(),
  name: z.string(),
  position: z.number(),
  visible: z.boolean(),
  variation: z.boolean(),
  options: z.array(z.string())
});

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve detailed information about a specific product, including pricing, inventory, images, attributes, categories, and variations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.number().describe('The product ID to retrieve')
    })
  )
  .output(
    z.object({
      productId: z.number().describe('Unique product identifier'),
      name: z.string(),
      slug: z.string(),
      type: z.string(),
      status: z.string(),
      featured: z.boolean(),
      catalogVisibility: z.string(),
      description: z.string(),
      shortDescription: z.string(),
      sku: z.string(),
      price: z.string(),
      regularPrice: z.string(),
      salePrice: z.string(),
      onSale: z.boolean(),
      purchasable: z.boolean(),
      totalSales: z.number(),
      virtual: z.boolean(),
      downloadable: z.boolean(),
      taxStatus: z.string(),
      taxClass: z.string(),
      manageStock: z.boolean(),
      stockQuantity: z.number().nullable(),
      stockStatus: z.string(),
      backorders: z.string(),
      weight: z.string(),
      dimensions: z.object({
        length: z.string(),
        width: z.string(),
        height: z.string()
      }),
      shippingClass: z.string(),
      categories: z.array(
        z.object({
          categoryId: z.number(),
          name: z.string(),
          slug: z.string()
        })
      ),
      tags: z.array(
        z.object({
          tagId: z.number(),
          name: z.string(),
          slug: z.string()
        })
      ),
      images: z.array(imageSchema),
      attributes: z.array(attributeSchema),
      variations: z.array(z.number()).describe('IDs of product variations'),
      permalink: z.string(),
      dateCreated: z.string(),
      dateModified: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let p = await client.getProduct(ctx.input.productId);

    return {
      output: {
        productId: p.id,
        name: p.name,
        slug: p.slug,
        type: p.type,
        status: p.status,
        featured: p.featured,
        catalogVisibility: p.catalog_visibility || '',
        description: p.description || '',
        shortDescription: p.short_description || '',
        sku: p.sku || '',
        price: p.price || '',
        regularPrice: p.regular_price || '',
        salePrice: p.sale_price || '',
        onSale: p.on_sale,
        purchasable: p.purchasable,
        totalSales: p.total_sales || 0,
        virtual: p.virtual,
        downloadable: p.downloadable,
        taxStatus: p.tax_status || '',
        taxClass: p.tax_class || '',
        manageStock: p.manage_stock,
        stockQuantity: p.stock_quantity,
        stockStatus: p.stock_status,
        backorders: p.backorders || 'no',
        weight: p.weight || '',
        dimensions: {
          length: p.dimensions?.length || '',
          width: p.dimensions?.width || '',
          height: p.dimensions?.height || ''
        },
        shippingClass: p.shipping_class || '',
        categories: (p.categories || []).map((c: any) => ({
          categoryId: c.id,
          name: c.name,
          slug: c.slug
        })),
        tags: (p.tags || []).map((t: any) => ({
          tagId: t.id,
          name: t.name,
          slug: t.slug
        })),
        images: (p.images || []).map((i: any) => ({
          imageId: i.id,
          src: i.src,
          name: i.name || '',
          alt: i.alt || ''
        })),
        attributes: (p.attributes || []).map((a: any) => ({
          attributeId: a.id,
          name: a.name,
          position: a.position,
          visible: a.visible,
          variation: a.variation,
          options: a.options || []
        })),
        variations: p.variations || [],
        permalink: p.permalink || '',
        dateCreated: p.date_created || '',
        dateModified: p.date_modified || ''
      },
      message: `Retrieved product **"${p.name}"** (ID: ${p.id}, type: ${p.type}, status: ${p.status}).`
    };
  })
  .build();
