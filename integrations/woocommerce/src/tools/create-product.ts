import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product in the WooCommerce store. Supports simple, grouped, external, and variable product types. Configure pricing, inventory, images, categories, tags, and attributes.`,
  instructions: [
    'For variable products, create the product first then use the Manage Product Variations tool to add variations.',
    'Images can be provided as URLs; the first image becomes the main product image.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Product name'),
      type: z
        .enum(['simple', 'grouped', 'external', 'variable'])
        .optional()
        .default('simple')
        .describe('Product type'),
      status: z
        .enum(['draft', 'pending', 'publish', 'private'])
        .optional()
        .default('publish')
        .describe('Product status'),
      description: z.string().optional().describe('Full product description (HTML allowed)'),
      shortDescription: z
        .string()
        .optional()
        .describe('Short product description (HTML allowed)'),
      sku: z.string().optional().describe('Stock keeping unit'),
      regularPrice: z.string().optional().describe('Regular price'),
      salePrice: z.string().optional().describe('Sale price'),
      virtual: z.boolean().optional().describe('Whether the product is virtual (no shipping)'),
      downloadable: z.boolean().optional().describe('Whether the product is downloadable'),
      featured: z.boolean().optional().describe('Whether the product is featured'),
      catalogVisibility: z
        .enum(['visible', 'catalog', 'search', 'hidden'])
        .optional()
        .describe('Catalog visibility'),
      taxStatus: z.enum(['taxable', 'shipping', 'none']).optional().describe('Tax status'),
      taxClass: z.string().optional().describe('Tax class'),
      manageStock: z.boolean().optional().describe('Enable stock management at product level'),
      stockQuantity: z
        .number()
        .optional()
        .describe('Stock quantity (requires manageStock: true)'),
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
        .describe('Product categories'),
      tags: z
        .array(
          z.object({
            tagId: z.number().describe('Tag ID')
          })
        )
        .optional()
        .describe('Product tags'),
      images: z
        .array(
          z.object({
            src: z.string().describe('Image URL'),
            name: z.string().optional().describe('Image name'),
            alt: z.string().optional().describe('Image alt text')
          })
        )
        .optional()
        .describe('Product images (first image is the main image)'),
      attributes: z
        .array(
          z.object({
            name: z.string().describe('Attribute name'),
            visible: z.boolean().optional().describe('Whether visible on product page'),
            variation: z.boolean().optional().describe('Whether used for variations'),
            options: z.array(z.string()).describe('Attribute options/values')
          })
        )
        .optional()
        .describe('Product attributes'),
      externalUrl: z.string().optional().describe('External product URL (for external type)'),
      buttonText: z.string().optional().describe('Buy button text (for external type)')
    })
  )
  .output(
    z.object({
      productId: z.number().describe('Created product ID'),
      name: z.string(),
      type: z.string(),
      status: z.string(),
      permalink: z.string(),
      price: z.string(),
      sku: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let data: Record<string, any> = {
      name: input.name,
      type: input.type,
      status: input.status
    };

    if (input.description !== undefined) data.description = input.description;
    if (input.shortDescription !== undefined) data.short_description = input.shortDescription;
    if (input.sku !== undefined) data.sku = input.sku;
    if (input.regularPrice !== undefined) data.regular_price = input.regularPrice;
    if (input.salePrice !== undefined) data.sale_price = input.salePrice;
    if (input.virtual !== undefined) data.virtual = input.virtual;
    if (input.downloadable !== undefined) data.downloadable = input.downloadable;
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
    if (input.externalUrl !== undefined) data.external_url = input.externalUrl;
    if (input.buttonText !== undefined) data.button_text = input.buttonText;

    if (input.categories) {
      data.categories = input.categories.map(c => ({ id: c.categoryId }));
    }
    if (input.tags) {
      data.tags = input.tags.map(t => ({ id: t.tagId }));
    }
    if (input.images) {
      data.images = input.images.map(i => ({
        src: i.src,
        name: i.name,
        alt: i.alt
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

    let product = await client.createProduct(data);

    return {
      output: {
        productId: product.id,
        name: product.name,
        type: product.type,
        status: product.status,
        permalink: product.permalink || '',
        price: product.price || '',
        sku: product.sku || ''
      },
      message: `Created product **"${product.name}"** (ID: ${product.id}, type: ${product.type}).`
    };
  })
  .build();
