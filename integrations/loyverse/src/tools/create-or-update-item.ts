import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateItem = SlateTool.create(spec, {
  name: 'Create or Update Item',
  key: 'create_or_update_item',
  description: `Create a new item (product) or update an existing one in the catalog. If an **itemId** is provided, the item is updated; otherwise a new item is created. Supports setting variants, pricing, categories, taxes, and modifiers.`,
  instructions: [
    'To create a new item, omit the itemId field.',
    'To update an existing item, provide the itemId field.',
    'Variants are nested inside the item; each variant can have its own SKU, barcode, cost, and price.'
  ],
  constraints: ['Receipts created via API cannot have more than one payment type.']
})
  .input(
    z.object({
      itemId: z.string().optional().describe('Item ID to update; omit to create a new item'),
      itemName: z.string().optional().describe('Name of the item'),
      description: z.string().optional().describe('Item description'),
      categoryId: z.string().nullable().optional().describe('Category ID to assign'),
      trackStock: z.boolean().optional().describe('Enable stock tracking'),
      soldByWeight: z.boolean().optional().describe('Whether item is sold by weight'),
      useProduction: z.boolean().optional().describe('Whether item uses production'),
      primarySupplierId: z.string().nullable().optional().describe('Primary supplier ID'),
      taxIds: z.array(z.string()).optional().describe('Tax IDs to apply'),
      modifierIds: z.array(z.string()).optional().describe('Modifier IDs to apply'),
      form: z.string().nullable().optional().describe('Item form'),
      color: z.string().nullable().optional().describe('Display color'),
      option1Name: z.string().nullable().optional().describe('First option name (e.g., Size)'),
      option2Name: z
        .string()
        .nullable()
        .optional()
        .describe('Second option name (e.g., Color)'),
      option3Name: z.string().nullable().optional().describe('Third option name'),
      variants: z
        .array(
          z.object({
            variantId: z
              .string()
              .optional()
              .describe('Variant ID to update; omit for new variant'),
            sku: z.string().nullable().optional().describe('SKU code'),
            option1Value: z.string().nullable().optional().describe('First option value'),
            option2Value: z.string().nullable().optional().describe('Second option value'),
            option3Value: z.string().nullable().optional().describe('Third option value'),
            barcode: z.string().nullable().optional().describe('Barcode'),
            cost: z.number().nullable().optional().describe('Cost price'),
            defaultPrice: z.number().nullable().optional().describe('Default selling price'),
            stores: z
              .array(
                z.object({
                  storeId: z.string(),
                  pricingType: z.string().optional(),
                  price: z.number().nullable().optional(),
                  availableForSale: z.boolean().optional()
                })
              )
              .optional()
              .describe('Store-specific pricing')
          })
        )
        .optional()
        .describe('Item variants')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the created/updated item'),
      itemName: z.string().describe('Name of the item'),
      variantCount: z.number().describe('Number of variants'),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: any = {};
    if (ctx.input.itemId) body.id = ctx.input.itemId;
    if (ctx.input.itemName !== undefined) body.item_name = ctx.input.itemName;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.categoryId !== undefined) body.category_id = ctx.input.categoryId;
    if (ctx.input.trackStock !== undefined) body.track_stock = ctx.input.trackStock;
    if (ctx.input.soldByWeight !== undefined) body.sold_by_weight = ctx.input.soldByWeight;
    if (ctx.input.useProduction !== undefined) body.use_production = ctx.input.useProduction;
    if (ctx.input.primarySupplierId !== undefined)
      body.primary_supplier_id = ctx.input.primarySupplierId;
    if (ctx.input.taxIds !== undefined) body.tax_ids = ctx.input.taxIds;
    if (ctx.input.modifierIds !== undefined) body.modifier_ids = ctx.input.modifierIds;
    if (ctx.input.form !== undefined) body.form = ctx.input.form;
    if (ctx.input.color !== undefined) body.color = ctx.input.color;
    if (ctx.input.option1Name !== undefined) body.option1_name = ctx.input.option1Name;
    if (ctx.input.option2Name !== undefined) body.option2_name = ctx.input.option2Name;
    if (ctx.input.option3Name !== undefined) body.option3_name = ctx.input.option3Name;

    if (ctx.input.variants) {
      body.variants = ctx.input.variants.map(v => {
        let variant: any = {};
        if (v.variantId) variant.variant_id = v.variantId;
        if (v.sku !== undefined) variant.sku = v.sku;
        if (v.option1Value !== undefined) variant.option1_value = v.option1Value;
        if (v.option2Value !== undefined) variant.option2_value = v.option2Value;
        if (v.option3Value !== undefined) variant.option3_value = v.option3Value;
        if (v.barcode !== undefined) variant.barcode = v.barcode;
        if (v.cost !== undefined) variant.cost = v.cost;
        if (v.defaultPrice !== undefined) variant.default_price = v.defaultPrice;
        if (v.stores) {
          variant.stores = v.stores.map(s => ({
            store_id: s.storeId,
            pricing_type: s.pricingType,
            price: s.price,
            available_for_sale: s.availableForSale
          }));
        }
        return variant;
      });
    }

    let result = await client.createItem(body);
    let isUpdate = !!ctx.input.itemId;

    return {
      output: {
        itemId: result.id,
        itemName: result.item_name,
        variantCount: (result.variants ?? []).length,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: `${isUpdate ? 'Updated' : 'Created'} item **${result.item_name}** with ${(result.variants ?? []).length} variant(s).`
    };
  })
  .build();
