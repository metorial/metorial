import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { shopifyServiceError } from '../lib/errors';
import { spec } from '../spec';

let variantOutputSchema = z.object({
  variantId: z.string(),
  productId: z.string(),
  title: z.string(),
  price: z.string(),
  compareAtPrice: z.string().nullable(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  position: z.number(),
  inventoryQuantity: z.number(),
  inventoryItemId: z.string(),
  weight: z.number().nullable(),
  weightUnit: z.string().nullable()
});

export let manageVariants = SlateTool.create(spec, {
  name: 'Manage Variants',
  key: 'manage_variants',
  description: `Create, update, or delete product variants. Use **action** to specify the operation.
- **create**: Add a new variant to a product
- **update**: Modify an existing variant's price, SKU, weight, etc.
- **delete**: Remove a variant from a product
- **list**: List all variants for a product`,
  tags: { destructive: false }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'list']).describe('Operation to perform'),
      productId: z.string().describe('Product ID the variant belongs to'),
      variantId: z.string().optional().describe('Variant ID (required for update and delete)'),
      title: z.string().optional().describe('Variant title'),
      price: z.string().optional().describe('Variant price'),
      compareAtPrice: z.string().optional().describe('Compare-at price'),
      sku: z.string().optional().describe('SKU'),
      barcode: z.string().optional().describe('Barcode'),
      weight: z.number().optional().describe('Weight'),
      weightUnit: z.string().optional().describe('Weight unit: g, kg, lb, oz'),
      requiresShipping: z.boolean().optional().describe('Requires shipping'),
      taxable: z.boolean().optional().describe('Is taxable'),
      option1: z.string().optional().describe('Option 1 value'),
      option2: z.string().optional().describe('Option 2 value'),
      option3: z.string().optional().describe('Option 3 value')
    })
  )
  .output(
    z.object({
      variants: z.array(variantOutputSchema).optional(),
      variant: variantOutputSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let mapVariant = (v: any) => ({
      variantId: String(v.id),
      productId: String(v.product_id),
      title: v.title,
      price: v.price,
      compareAtPrice: v.compare_at_price,
      sku: v.sku,
      barcode: v.barcode,
      position: v.position,
      inventoryQuantity: v.inventory_quantity,
      inventoryItemId: String(v.inventory_item_id),
      weight: v.weight,
      weightUnit: v.weight_unit
    });

    if (ctx.input.action === 'list') {
      let variants = await client.listVariants(ctx.input.productId);
      return {
        output: { variants: variants.map(mapVariant) },
        message: `Found **${variants.length}** variant(s) for product ${ctx.input.productId}.`
      };
    }

    if (ctx.input.action === 'create') {
      let variantData: Record<string, any> = {};
      if (ctx.input.title) variantData.title = ctx.input.title;
      if (ctx.input.price) variantData.price = ctx.input.price;
      if (ctx.input.compareAtPrice) variantData.compare_at_price = ctx.input.compareAtPrice;
      if (ctx.input.sku) variantData.sku = ctx.input.sku;
      if (ctx.input.barcode) variantData.barcode = ctx.input.barcode;
      if (ctx.input.weight !== undefined) variantData.weight = ctx.input.weight;
      if (ctx.input.weightUnit) variantData.weight_unit = ctx.input.weightUnit;
      if (ctx.input.requiresShipping !== undefined)
        variantData.requires_shipping = ctx.input.requiresShipping;
      if (ctx.input.taxable !== undefined) variantData.taxable = ctx.input.taxable;
      if (ctx.input.option1) variantData.option1 = ctx.input.option1;
      if (ctx.input.option2) variantData.option2 = ctx.input.option2;
      if (ctx.input.option3) variantData.option3 = ctx.input.option3;

      let variant = await client.createVariant(ctx.input.productId, variantData);
      return {
        output: { variant: mapVariant(variant) },
        message: `Created variant **${variant.title}** (${variant.price}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.variantId) throw shopifyServiceError('variantId is required for update');
      let variantData: Record<string, any> = {};
      if (ctx.input.title) variantData.title = ctx.input.title;
      if (ctx.input.price) variantData.price = ctx.input.price;
      if (ctx.input.compareAtPrice) variantData.compare_at_price = ctx.input.compareAtPrice;
      if (ctx.input.sku) variantData.sku = ctx.input.sku;
      if (ctx.input.barcode) variantData.barcode = ctx.input.barcode;
      if (ctx.input.weight !== undefined) variantData.weight = ctx.input.weight;
      if (ctx.input.weightUnit) variantData.weight_unit = ctx.input.weightUnit;
      if (ctx.input.requiresShipping !== undefined)
        variantData.requires_shipping = ctx.input.requiresShipping;
      if (ctx.input.taxable !== undefined) variantData.taxable = ctx.input.taxable;
      if (ctx.input.option1) variantData.option1 = ctx.input.option1;
      if (ctx.input.option2) variantData.option2 = ctx.input.option2;
      if (ctx.input.option3) variantData.option3 = ctx.input.option3;

      let variant = await client.updateVariant(ctx.input.variantId, variantData);
      return {
        output: { variant: mapVariant(variant) },
        message: `Updated variant **${variant.title}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.variantId) throw shopifyServiceError('variantId is required for delete');
      await client.deleteVariant(ctx.input.productId, ctx.input.variantId);
      return {
        output: { deleted: true },
        message: `Deleted variant **${ctx.input.variantId}**.`
      };
    }

    throw shopifyServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
