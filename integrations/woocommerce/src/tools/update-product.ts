import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Update an existing product's details including name, pricing, inventory, images, categories, tags, and attributes. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      productId: z.number().describe('The product ID to update'),
      name: z.string().optional().describe('Product name'),
      status: z
        .enum(['draft', 'pending', 'publish', 'private'])
        .optional()
        .describe('Product status'),
      description: z.string().optional().describe('Full product description'),
      shortDescription: z.string().optional().describe('Short product description'),
      sku: z.string().optional().describe('Stock keeping unit'),
      regularPrice: z.string().optional().describe('Regular price'),
      salePrice: z.string().optional().describe('Sale price'),
      featured: z.boolean().optional().describe('Whether featured'),
      catalogVisibility: z
        .enum(['visible', 'catalog', 'search', 'hidden'])
        .optional()
        .describe('Catalog visibility'),
      taxStatus: z.enum(['taxable', 'shipping', 'none']).optional().describe('Tax status'),
      taxClass: z.string().optional().describe('Tax class'),
      manageStock: z.boolean().optional().describe('Enable stock management'),
      stockQuantity: z.number().optional().describe('Stock quantity'),
      stockStatus: z
        .enum(['instock', 'outofstock', 'onbackorder'])
        .optional()
        .describe('Stock status'),
      backorders: z.enum(['no', 'notify', 'yes']).optional().describe('Backorder handling'),
      weight: z.string().optional().describe('Product weight'),
      dimensions: z
        .object({
          length: z.string().optional(),
          width: z.string().optional(),
          height: z.string().optional()
        })
        .optional()
        .describe('Product dimensions'),
      categories: z
        .array(
          z.object({
            categoryId: z.number().describe('Category ID')
          })
        )
        .optional()
        .describe('Product categories (replaces existing)'),
      tags: z
        .array(
          z.object({
            tagId: z.number().describe('Tag ID')
          })
        )
        .optional()
        .describe('Product tags (replaces existing)'),
      images: z
        .array(
          z.object({
            imageId: z.number().optional().describe('Existing image ID to keep'),
            src: z.string().optional().describe('New image URL'),
            name: z.string().optional(),
            alt: z.string().optional()
          })
        )
        .optional()
        .describe('Product images (replaces existing)'),
      attributes: z
        .array(
          z.object({
            name: z.string().describe('Attribute name'),
            visible: z.boolean().optional(),
            variation: z.boolean().optional(),
            options: z.array(z.string())
          })
        )
        .optional()
        .describe('Product attributes (replaces existing)')
    })
  )
  .output(
    z.object({
      productId: z.number(),
      name: z.string(),
      status: z.string(),
      price: z.string(),
      sku: z.string(),
      permalink: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let data: Record<string, any> = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.status !== undefined) data.status = input.status;
    if (input.description !== undefined) data.description = input.description;
    if (input.shortDescription !== undefined) data.short_description = input.shortDescription;
    if (input.sku !== undefined) data.sku = input.sku;
    if (input.regularPrice !== undefined) data.regular_price = input.regularPrice;
    if (input.salePrice !== undefined) data.sale_price = input.salePrice;
    if (input.featured !== undefined) data.featured = input.featured;
    if (input.catalogVisibility !== undefined)
      data.catalog_visibility = input.catalogVisibility;
    if (input.taxStatus !== undefined) data.tax_status = input.taxStatus;
    if (input.taxClass !== undefined) data.tax_class = input.taxClass;
    if (input.manageStock !== undefined) data.manage_stock = input.manageStock;
    if (input.stockQuantity !== undefined) data.stock_quantity = input.stockQuantity;
    if (input.stockStatus !== undefined) data.stock_status = input.stockStatus;
    if (input.backorders !== undefined) data.backorders = input.backorders;
    if (input.weight !== undefined) data.weight = input.weight;
    if (input.dimensions) data.dimensions = input.dimensions;

    if (input.categories) {
      data.categories = input.categories.map(c => ({ id: c.categoryId }));
    }
    if (input.tags) {
      data.tags = input.tags.map(t => ({ id: t.tagId }));
    }
    if (input.images) {
      data.images = input.images.map(i => ({
        ...(i.imageId ? { id: i.imageId } : {}),
        ...(i.src ? { src: i.src } : {}),
        ...(i.name ? { name: i.name } : {}),
        ...(i.alt ? { alt: i.alt } : {})
      }));
    }
    if (input.attributes) {
      data.attributes = input.attributes.map(a => ({
        name: a.name,
        visible: a.visible ?? true,
        variation: a.variation ?? false,
        options: a.options
      }));
    }

    let product = await client.updateProduct(input.productId, data);

    return {
      output: {
        productId: product.id,
        name: product.name,
        status: product.status,
        price: product.price || '',
        sku: product.sku || '',
        permalink: product.permalink || ''
      },
      message: `Updated product **"${product.name}"** (ID: ${product.id}).`
    };
  })
  .build();
