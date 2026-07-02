import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

let variantCategorySchema = z.object({
  variantCategoryId: z.string().describe('Unique variant category ID'),
  title: z.string().describe('Category title'),
  variants: z
    .array(
      z.object({
        variantId: z.string().describe('Unique variant ID'),
        name: z.string().describe('Variant name'),
        priceDifferenceCents: z.number().optional().describe('Price adjustment in cents'),
        maxPurchaseCount: z.number().optional().describe('Maximum purchases (0 = unlimited)')
      })
    )
    .optional()
    .describe('Variants within this category')
});

let variantSchema = z.object({
  variantId: z.string().describe('Unique variant ID'),
  name: z.string().describe('Variant name'),
  priceDifferenceCents: z.number().optional().describe('Price adjustment in cents'),
  maxPurchaseCount: z.number().optional().describe('Maximum purchases (0 = unlimited)')
});

export let manageVariants = SlateTool.create(spec, {
  name: 'Manage Variants',
  key: 'manage_variants',
  description: `Manage variant categories and individual variants on a Gumroad product. Variant categories group product options (e.g., "Tier", "Format"), and each category contains individual variants (e.g., "Basic", "Premium").`,
  instructions: [
    'First create a variant category, then add variants to it.',
    'Use "list_categories" to see all categories and their variants.',
    'Provide variantCategoryId when working with individual variants.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_categories',
          'create_category',
          'update_category',
          'delete_category',
          'list_variants',
          'create_variant',
          'update_variant',
          'delete_variant'
        ])
        .describe('Action to perform'),
      productId: z.string().describe('The product ID'),
      variantCategoryId: z
        .string()
        .optional()
        .describe(
          'Variant category ID (required for category update/delete and all variant operations)'
        ),
      variantId: z
        .string()
        .optional()
        .describe('Variant ID (required for update_variant, delete_variant)'),
      title: z
        .string()
        .optional()
        .describe('Category title (for create_category, update_category)'),
      name: z
        .string()
        .optional()
        .describe('Variant name (for create_variant, update_variant)'),
      priceDifferenceCents: z
        .number()
        .optional()
        .describe('Price adjustment in cents (for create_variant, update_variant)'),
      maxPurchaseCount: z
        .number()
        .optional()
        .describe('Maximum purchases, 0 = unlimited (for create_variant, update_variant)')
    })
  )
  .output(
    z.object({
      variantCategory: variantCategorySchema.optional().describe('Single variant category'),
      variantCategories: z
        .array(variantCategorySchema)
        .optional()
        .describe('List of variant categories'),
      variant: variantSchema.optional().describe('Single variant'),
      variants: z.array(variantSchema).optional().describe('List of variants'),
      deleted: z.boolean().optional().describe('Whether the resource was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let { action, productId, variantCategoryId, variantId } = ctx.input;

    // ── Category operations ──

    if (action === 'list_categories') {
      let categories = await client.listVariantCategories(productId);
      let mapped = categories.map((c: any) => ({
        variantCategoryId: c.id,
        title: c.title || '',
        variants: (c.variants || []).map((v: any) => ({
          variantId: v.id,
          name: v.name || '',
          priceDifferenceCents: v.price_difference_cents,
          maxPurchaseCount: v.max_purchase_count
        }))
      }));
      return {
        output: { variantCategories: mapped },
        message: `Found **${mapped.length}** variant category(ies).`
      };
    }

    if (action === 'create_category') {
      if (!ctx.input.title) throw new Error('title is required for create_category');
      let cat = await client.createVariantCategory(productId, ctx.input.title);
      return {
        output: {
          variantCategory: {
            variantCategoryId: cat.id,
            title: cat.title || ''
          }
        },
        message: `Created variant category **${cat.title}**.`
      };
    }

    if (action === 'update_category') {
      if (!variantCategoryId)
        throw new Error('variantCategoryId is required for update_category');
      if (!ctx.input.title) throw new Error('title is required for update_category');
      let cat = await client.updateVariantCategory(
        productId,
        variantCategoryId,
        ctx.input.title
      );
      return {
        output: {
          variantCategory: {
            variantCategoryId: cat.id,
            title: cat.title || ''
          }
        },
        message: `Updated variant category **${cat.title}**.`
      };
    }

    if (action === 'delete_category') {
      if (!variantCategoryId)
        throw new Error('variantCategoryId is required for delete_category');
      await client.deleteVariantCategory(productId, variantCategoryId);
      return {
        output: { deleted: true },
        message: `Deleted variant category **${variantCategoryId}**.`
      };
    }

    // ── Variant operations ──

    if (action === 'list_variants') {
      if (!variantCategoryId)
        throw new Error('variantCategoryId is required for list_variants');
      let variants = await client.listVariants(productId, variantCategoryId);
      let mapped = variants.map((v: any) => ({
        variantId: v.id,
        name: v.name || '',
        priceDifferenceCents: v.price_difference_cents,
        maxPurchaseCount: v.max_purchase_count
      }));
      return {
        output: { variants: mapped },
        message: `Found **${mapped.length}** variant(s).`
      };
    }

    if (action === 'create_variant') {
      if (!variantCategoryId)
        throw new Error('variantCategoryId is required for create_variant');
      if (!ctx.input.name) throw new Error('name is required for create_variant');
      let v = await client.createVariant(productId, variantCategoryId, {
        name: ctx.input.name,
        priceDifferenceCents: ctx.input.priceDifferenceCents,
        maxPurchaseCount: ctx.input.maxPurchaseCount
      });
      return {
        output: {
          variant: {
            variantId: v.id,
            name: v.name || '',
            priceDifferenceCents: v.price_difference_cents,
            maxPurchaseCount: v.max_purchase_count
          }
        },
        message: `Created variant **${v.name}**.`
      };
    }

    if (action === 'update_variant') {
      if (!variantCategoryId)
        throw new Error('variantCategoryId is required for update_variant');
      if (!variantId) throw new Error('variantId is required for update_variant');
      let v = await client.updateVariant(productId, variantCategoryId, variantId, {
        name: ctx.input.name,
        priceDifferenceCents: ctx.input.priceDifferenceCents,
        maxPurchaseCount: ctx.input.maxPurchaseCount
      });
      return {
        output: {
          variant: {
            variantId: v.id,
            name: v.name || '',
            priceDifferenceCents: v.price_difference_cents,
            maxPurchaseCount: v.max_purchase_count
          }
        },
        message: `Updated variant **${v.name}**.`
      };
    }

    if (action === 'delete_variant') {
      if (!variantCategoryId)
        throw new Error('variantCategoryId is required for delete_variant');
      if (!variantId) throw new Error('variantId is required for delete_variant');
      await client.deleteVariant(productId, variantCategoryId, variantId);
      return {
        output: { deleted: true },
        message: `Deleted variant **${variantId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
