import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let variantSchema = z.object({
  variantId: z.string().describe('Unique ID of the variant'),
  itemId: z.string().describe('ID of the parent item'),
  sku: z.string().nullable().describe('SKU code'),
  referenceVariantId: z.string().nullable().optional().describe('Reference variant ID'),
  option1Value: z.string().nullable().optional().describe('First option value'),
  option2Value: z.string().nullable().optional().describe('Second option value'),
  option3Value: z.string().nullable().optional().describe('Third option value'),
  barcode: z.string().nullable().optional().describe('Barcode'),
  cost: z.number().nullable().optional().describe('Cost price'),
  purchaseCost: z.number().nullable().optional().describe('Purchase cost'),
  defaultPrice: z.number().nullable().optional().describe('Default selling price'),
  storesAvailability: z
    .array(
      z.object({
        storeId: z.string(),
        pricingType: z.string().optional(),
        price: z.number().nullable().optional(),
        availableForSale: z.boolean().optional()
      })
    )
    .optional()
    .describe('Store-specific pricing and availability'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  deletedAt: z.string().nullable().optional().describe('Deletion timestamp')
});

let itemSchema = z.object({
  itemId: z.string().describe('Unique ID of the item'),
  handle: z.string().nullable().optional().describe('URL-friendly handle'),
  referenceId: z.string().nullable().optional().describe('External reference ID'),
  itemName: z.string().describe('Name of the item'),
  description: z.string().nullable().optional().describe('Item description'),
  categoryId: z.string().nullable().optional().describe('Category ID'),
  trackStock: z.boolean().optional().describe('Whether stock tracking is enabled'),
  soldByWeight: z.boolean().optional().describe('Whether item is sold by weight'),
  isComposite: z.boolean().optional().describe('Whether item is a composite'),
  useProduction: z.boolean().optional().describe('Whether item uses production'),
  primarySupplierId: z.string().nullable().optional().describe('Primary supplier ID'),
  taxIds: z.array(z.string()).optional().describe('Applied tax IDs'),
  modifierIds: z.array(z.string()).optional().describe('Applied modifier IDs'),
  form: z.string().nullable().optional().describe('Item form'),
  color: z.string().nullable().optional().describe('Item display color'),
  imageUrl: z.string().nullable().optional().describe('Image URL'),
  option1Name: z.string().nullable().optional().describe('First option name (e.g., Size)'),
  option2Name: z.string().nullable().optional().describe('Second option name'),
  option3Name: z.string().nullable().optional().describe('Third option name'),
  variants: z.array(variantSchema).optional().describe('Item variants'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  deletedAt: z.string().nullable().optional().describe('Deletion timestamp')
});

export let listItems = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `Retrieve items (products) from the Loyverse catalog. Supports filtering by update time for syncing recently changed products. Returns paginated results with variants, pricing, stock tracking, and category assignments.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of items to return (1-250, default 50)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Filter items updated at or after this ISO 8601 timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Filter items updated at or before this ISO 8601 timestamp'),
      showDeleted: z.boolean().optional().describe('Include deleted items in the response')
    })
  )
  .output(
    z.object({
      items: z.array(itemSchema).describe('List of items'),
      cursor: z.string().nullable().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listItems({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax,
      showDeleted: ctx.input.showDeleted
    });

    let items = (result.items ?? []).map((item: any) => ({
      itemId: item.id,
      handle: item.handle,
      referenceId: item.reference_id,
      itemName: item.item_name,
      description: item.description,
      categoryId: item.category_id,
      trackStock: item.track_stock,
      soldByWeight: item.sold_by_weight,
      isComposite: item.is_composite,
      useProduction: item.use_production,
      primarySupplierId: item.primary_supplier_id,
      taxIds: item.tax_ids,
      modifierIds: item.modifier_ids,
      form: item.form,
      color: item.color,
      imageUrl: item.image_url,
      option1Name: item.option1_name,
      option2Name: item.option2_name,
      option3Name: item.option3_name,
      variants: (item.variants ?? []).map((v: any) => ({
        variantId: v.variant_id,
        itemId: v.item_id,
        sku: v.sku,
        referenceVariantId: v.reference_variant_id,
        option1Value: v.option1_value,
        option2Value: v.option2_value,
        option3Value: v.option3_value,
        barcode: v.barcode,
        cost: v.cost,
        purchaseCost: v.purchase_cost,
        defaultPrice: v.default_price,
        storesAvailability: (v.stores ?? []).map((s: any) => ({
          storeId: s.store_id,
          pricingType: s.pricing_type,
          price: s.price,
          availableForSale: s.available_for_sale
        })),
        createdAt: v.created_at,
        updatedAt: v.updated_at,
        deletedAt: v.deleted_at
      })),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      deletedAt: item.deleted_at
    }));

    return {
      output: {
        items,
        cursor: result.cursor
      },
      message: `Retrieved **${items.length}** item(s).${result.cursor ? ' More items available via cursor pagination.' : ''}`
    };
  })
  .build();
