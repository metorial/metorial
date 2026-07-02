import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getItem = SlateTool.create(spec, {
  name: 'Get Item',
  key: 'get_item',
  description: `Retrieve a single item (product) by its ID, including full variant details, pricing, and configuration.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      itemId: z.string().describe('The unique ID of the item to retrieve')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Unique ID of the item'),
      itemName: z.string().describe('Name of the item'),
      description: z.string().nullable().optional().describe('Item description'),
      categoryId: z.string().nullable().optional().describe('Category ID'),
      trackStock: z.boolean().optional().describe('Whether stock tracking is enabled'),
      soldByWeight: z.boolean().optional().describe('Whether item is sold by weight'),
      isComposite: z.boolean().optional().describe('Whether item is a composite'),
      primarySupplierId: z.string().nullable().optional().describe('Primary supplier ID'),
      taxIds: z.array(z.string()).optional().describe('Applied tax IDs'),
      modifierIds: z.array(z.string()).optional().describe('Applied modifier IDs'),
      imageUrl: z.string().nullable().optional().describe('Image URL'),
      option1Name: z.string().nullable().optional().describe('First option name'),
      option2Name: z.string().nullable().optional().describe('Second option name'),
      option3Name: z.string().nullable().optional().describe('Third option name'),
      variants: z
        .array(
          z.object({
            variantId: z.string(),
            sku: z.string().nullable().optional(),
            option1Value: z.string().nullable().optional(),
            option2Value: z.string().nullable().optional(),
            option3Value: z.string().nullable().optional(),
            barcode: z.string().nullable().optional(),
            cost: z.number().nullable().optional(),
            defaultPrice: z.number().nullable().optional(),
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
          })
        )
        .optional()
        .describe('Item variants'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let item = await client.getItem(ctx.input.itemId);

    let output = {
      itemId: item.id,
      itemName: item.item_name,
      description: item.description,
      categoryId: item.category_id,
      trackStock: item.track_stock,
      soldByWeight: item.sold_by_weight,
      isComposite: item.is_composite,
      primarySupplierId: item.primary_supplier_id,
      taxIds: item.tax_ids,
      modifierIds: item.modifier_ids,
      imageUrl: item.image_url,
      option1Name: item.option1_name,
      option2Name: item.option2_name,
      option3Name: item.option3_name,
      variants: (item.variants ?? []).map((v: any) => ({
        variantId: v.variant_id,
        sku: v.sku,
        option1Value: v.option1_value,
        option2Value: v.option2_value,
        option3Value: v.option3_value,
        barcode: v.barcode,
        cost: v.cost,
        defaultPrice: v.default_price,
        storesAvailability: (v.stores ?? []).map((s: any) => ({
          storeId: s.store_id,
          pricingType: s.pricing_type,
          price: s.price,
          availableForSale: s.available_for_sale
        }))
      })),
      createdAt: item.created_at,
      updatedAt: item.updated_at
    };

    return {
      output,
      message: `Retrieved item **${item.item_name}** with ${(item.variants ?? []).length} variant(s).`
    };
  })
  .build();
