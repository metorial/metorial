import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let variationSchema = z.object({
  variationId: z.number(),
  sku: z.string(),
  price: z.string(),
  regularPrice: z.string(),
  salePrice: z.string(),
  status: z.string(),
  stockStatus: z.string(),
  stockQuantity: z.number().nullable(),
  manageStock: z.boolean(),
  attributes: z.array(
    z.object({
      name: z.string(),
      option: z.string()
    })
  ),
  weight: z.string(),
  dimensions: z.object({
    length: z.string(),
    width: z.string(),
    height: z.string()
  })
});

export let manageProductVariations = SlateTool.create(spec, {
  name: 'Manage Product Variations',
  key: 'manage_product_variations',
  description: `List, create, update, or delete variations for a variable product. Use the action field to choose the operation.`,
  instructions: [
    'The parent product must be of type "variable" to support variations.',
    'When creating a variation, specify the attribute values that define this variation.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      productId: z.number().describe('Parent product ID'),
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      variationId: z.number().optional().describe('Variation ID (required for update/delete)'),
      perPage: z.number().optional().default(10).describe('Results per page for list action'),
      page: z.number().optional().default(1).describe('Page number for list action'),
      sku: z.string().optional().describe('Variation SKU'),
      regularPrice: z.string().optional().describe('Regular price'),
      salePrice: z.string().optional().describe('Sale price'),
      status: z.enum(['publish', 'private']).optional().describe('Variation status'),
      manageStock: z.boolean().optional().describe('Enable stock management'),
      stockQuantity: z.number().optional().describe('Stock quantity'),
      stockStatus: z
        .enum(['instock', 'outofstock', 'onbackorder'])
        .optional()
        .describe('Stock status'),
      weight: z.string().optional().describe('Variation weight'),
      dimensions: z
        .object({
          length: z.string().optional(),
          width: z.string().optional(),
          height: z.string().optional()
        })
        .optional()
        .describe('Variation dimensions'),
      attributes: z
        .array(
          z.object({
            name: z.string().describe('Attribute name (must match parent product attribute)'),
            option: z.string().describe('Attribute option value')
          })
        )
        .optional()
        .describe('Attribute values for this variation'),
      image: z
        .object({
          src: z.string().describe('Image URL'),
          name: z.string().optional(),
          alt: z.string().optional()
        })
        .optional()
        .describe('Variation image'),
      force: z.boolean().optional().default(false).describe('Force permanent deletion')
    })
  )
  .output(
    z.object({
      variations: z
        .array(variationSchema)
        .optional()
        .describe('List of variations (for list action)'),
      variation: variationSchema
        .optional()
        .describe('Single variation (for create/update action)'),
      deleted: z.boolean().optional().describe('Deletion confirmation')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { productId, action } = ctx.input;

    if (action === 'list') {
      let variations = await client.listProductVariations(productId, {
        page: ctx.input.page,
        per_page: ctx.input.perPage
      });

      let mapped = variations.map((v: any) => mapVariation(v));

      return {
        output: { variations: mapped },
        message: `Found **${mapped.length}** variations for product ${productId}.`
      };
    }

    if (action === 'create') {
      let data: Record<string, any> = {};
      if (ctx.input.sku !== undefined) data.sku = ctx.input.sku;
      if (ctx.input.regularPrice !== undefined) data.regular_price = ctx.input.regularPrice;
      if (ctx.input.salePrice !== undefined) data.sale_price = ctx.input.salePrice;
      if (ctx.input.status !== undefined) data.status = ctx.input.status;
      if (ctx.input.manageStock !== undefined) data.manage_stock = ctx.input.manageStock;
      if (ctx.input.stockQuantity !== undefined) data.stock_quantity = ctx.input.stockQuantity;
      if (ctx.input.stockStatus !== undefined) data.stock_status = ctx.input.stockStatus;
      if (ctx.input.weight !== undefined) data.weight = ctx.input.weight;
      if (ctx.input.dimensions) data.dimensions = ctx.input.dimensions;
      if (ctx.input.attributes)
        data.attributes = ctx.input.attributes.map(a => ({ name: a.name, option: a.option }));
      if (ctx.input.image) data.image = ctx.input.image;

      let variation = await client.createProductVariation(productId, data);

      return {
        output: { variation: mapVariation(variation) },
        message: `Created variation (ID: ${variation.id}) for product ${productId}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.variationId) throw new Error('variationId is required for update action');

      let data: Record<string, any> = {};
      if (ctx.input.sku !== undefined) data.sku = ctx.input.sku;
      if (ctx.input.regularPrice !== undefined) data.regular_price = ctx.input.regularPrice;
      if (ctx.input.salePrice !== undefined) data.sale_price = ctx.input.salePrice;
      if (ctx.input.status !== undefined) data.status = ctx.input.status;
      if (ctx.input.manageStock !== undefined) data.manage_stock = ctx.input.manageStock;
      if (ctx.input.stockQuantity !== undefined) data.stock_quantity = ctx.input.stockQuantity;
      if (ctx.input.stockStatus !== undefined) data.stock_status = ctx.input.stockStatus;
      if (ctx.input.weight !== undefined) data.weight = ctx.input.weight;
      if (ctx.input.dimensions) data.dimensions = ctx.input.dimensions;
      if (ctx.input.attributes)
        data.attributes = ctx.input.attributes.map(a => ({ name: a.name, option: a.option }));
      if (ctx.input.image) data.image = ctx.input.image;

      let variation = await client.updateProductVariation(
        productId,
        ctx.input.variationId,
        data
      );

      return {
        output: { variation: mapVariation(variation) },
        message: `Updated variation (ID: ${variation.id}) for product ${productId}.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.variationId) throw new Error('variationId is required for delete action');

      await client.deleteProductVariation(productId, ctx.input.variationId, ctx.input.force);

      return {
        output: { deleted: true },
        message: `Deleted variation (ID: ${ctx.input.variationId}) from product ${productId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapVariation = (v: any) => ({
  variationId: v.id,
  sku: v.sku || '',
  price: v.price || '',
  regularPrice: v.regular_price || '',
  salePrice: v.sale_price || '',
  status: v.status || '',
  stockStatus: v.stock_status || '',
  stockQuantity: v.stock_quantity,
  manageStock: v.manage_stock || false,
  attributes: (v.attributes || []).map((a: any) => ({
    name: a.name,
    option: a.option
  })),
  weight: v.weight || '',
  dimensions: {
    length: v.dimensions?.length || '',
    width: v.dimensions?.width || '',
    height: v.dimensions?.height || ''
  }
});
