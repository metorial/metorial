import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { toWritableVariant } from '../lib/items';
import { pickWritable, requireForCreate } from '../lib/upsert';
import { spec } from '../spec';

let ITEM_WRITABLE_KEYS = [
  'id',
  'item_name',
  'description',
  'reference_id',
  'category_id',
  'track_stock',
  'sold_by_weight',
  'is_composite',
  'use_production',
  'components',
  'primary_supplier_id',
  'tax_ids',
  'modifiers_ids',
  'form',
  'color',
  'option1_name',
  'option2_name',
  'option3_name'
] as const;

export let createOrUpdateItem = SlateTool.create(spec, {
  name: 'Create or Update Item',
  key: 'create_or_update_item',
  description: `Create a new item (product) or update an existing one in the catalog. If an **itemId** is provided, the item is updated and fields you omit keep their current values; otherwise a new item is created. Supports setting variants, pricing, categories, taxes, and modifiers.`,
  instructions: [
    'To create a new item, omit itemId and provide itemName.',
    'To update an existing item, provide itemId and only the fields to change.',
    'Variants are nested inside the item; each variant can have its own SKU, barcode, cost, and price. When updating, include variantId to change an existing variant; variants without variantId are added. Existing variants you do not list are kept.',
    'Setting defaultPrice without defaultPricingType makes the variant price FIXED. VARIABLE pricing means the price is entered at the time of sale.',
    'Disabling trackStock resets all inventory levels of the item to 0.'
  ]
})
  .input(
    z.object({
      itemId: z.string().optional().describe('Item ID to update; omit to create a new item'),
      itemName: z
        .string()
        .optional()
        .describe('Name of the item (required when creating, max 64 characters)'),
      description: z.string().optional().describe('Item description'),
      referenceId: z.string().optional().describe('External reference ID for the item'),
      categoryId: z.string().nullable().optional().describe('Category ID to assign'),
      trackStock: z.boolean().optional().describe('Enable stock tracking'),
      soldByWeight: z.boolean().optional().describe('Whether item is sold by weight'),
      isComposite: z
        .boolean()
        .optional()
        .describe('Whether the item consists of component variants'),
      components: z
        .array(
          z.object({
            variantId: z
              .string()
              .describe('Component variant ID. Call list_variants to find variant IDs.'),
            quantity: z.number().describe('Quantity of this component in one composite item')
          })
        )
        .optional()
        .describe(
          'Complete component list for a composite item; replaces the current list when provided'
        ),
      useProduction: z
        .boolean()
        .optional()
        .describe('Whether a composite item tracks its own stock (production)'),
      primarySupplierId: z.string().nullable().optional().describe('Primary supplier ID'),
      taxIds: z.array(z.string()).optional().describe('Tax IDs to apply'),
      modifierIds: z.array(z.string()).optional().describe('Modifier IDs to apply'),
      form: z
        .string()
        .nullable()
        .optional()
        .describe('Item shape on the POS: SQUARE, CIRCLE, SUN, or OCTAGON'),
      color: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Display color on the POS: GREY, RED, PINK, ORANGE, YELLOW, GREEN, BLUE, or PURPLE'
        ),
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
            sku: z.string().nullable().optional().describe('SKU code (must be unique)'),
            referenceVariantId: z
              .string()
              .optional()
              .describe('External reference ID for the variant'),
            option1Value: z
              .string()
              .nullable()
              .optional()
              .describe('First option value (required if option1Name is set)'),
            option2Value: z
              .string()
              .nullable()
              .optional()
              .describe('Second option value (required if option2Name is set)'),
            option3Value: z
              .string()
              .nullable()
              .optional()
              .describe('Third option value (required if option3Name is set)'),
            barcode: z.string().nullable().optional().describe('Barcode'),
            cost: z.number().nullable().optional().describe('Cost price'),
            purchaseCost: z.number().optional().describe('Purchase cost'),
            defaultPricingType: z
              .enum(['FIXED', 'VARIABLE'])
              .optional()
              .describe('Default pricing type; VARIABLE means the price is entered at sale'),
            defaultPrice: z
              .number()
              .nullable()
              .optional()
              .describe('Default selling price (FIXED pricing)'),
            stores: z
              .array(
                z.object({
                  storeId: z.string().describe('Store ID'),
                  pricingType: z
                    .string()
                    .optional()
                    .describe('FIXED or VARIABLE; defaults to FIXED when price is set'),
                  price: z.number().nullable().optional().describe('Price in this store'),
                  availableForSale: z
                    .boolean()
                    .optional()
                    .describe('Whether the variant is sold in this store'),
                  optimalStock: z
                    .number()
                    .optional()
                    .describe('Optimal stock used for purchase orders'),
                  lowStock: z.number().optional().describe('Low stock alert threshold')
                })
              )
              .optional()
              .describe(
                'Store-specific pricing; on update, listed stores are merged into the current store settings and unlisted stores are kept'
              )
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
      variants: z
        .array(
          z.object({
            variantId: z.string().describe('Variant ID'),
            sku: z.string().nullable().optional().describe('SKU code'),
            defaultPrice: z.number().nullable().optional().describe('Default price')
          })
        )
        .optional()
        .describe('Variants of the item, with IDs for receipts and inventory updates'),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;
    let isUpdate = !!input.itemId;

    let existing: any;
    let body: any = {};
    if (isUpdate) {
      existing = await client.getItem(input.itemId!);
      body = pickWritable(existing, ITEM_WRITABLE_KEYS);
      body.id = input.itemId;
    } else {
      requireForCreate(input.itemName, 'itemName', 'item');
    }

    if (input.itemName !== undefined) body.item_name = input.itemName;
    if (input.description !== undefined) body.description = input.description;
    if (input.referenceId !== undefined) body.reference_id = input.referenceId;
    if (input.categoryId !== undefined) body.category_id = input.categoryId;
    if (input.trackStock !== undefined) body.track_stock = input.trackStock;
    if (input.soldByWeight !== undefined) body.sold_by_weight = input.soldByWeight;
    if (input.isComposite !== undefined) body.is_composite = input.isComposite;
    if (input.components !== undefined) {
      body.components = input.components.map(component => ({
        variant_id: component.variantId,
        quantity: component.quantity
      }));
    }
    if (input.useProduction !== undefined) body.use_production = input.useProduction;
    if (input.primarySupplierId !== undefined)
      body.primary_supplier_id = input.primarySupplierId;
    if (input.taxIds !== undefined) body.tax_ids = input.taxIds;
    if (input.modifierIds !== undefined) body.modifiers_ids = input.modifierIds;
    if (input.form !== undefined) body.form = input.form?.toUpperCase() ?? null;
    if (input.color !== undefined) body.color = input.color?.toUpperCase() ?? null;
    if (input.option1Name !== undefined) body.option1_name = input.option1Name;
    if (input.option2Name !== undefined) body.option2_name = input.option2Name;
    if (input.option3Name !== undefined) body.option3_name = input.option3Name;

    let existingVariants: any[] = existing?.variants ?? [];

    if (input.variants) {
      let listedIds = new Set(input.variants.map(v => v.variantId).filter(Boolean));
      let updatedVariants = input.variants.map(v => {
        let current = v.variantId
          ? existingVariants.find(ev => ev.variant_id === v.variantId)
          : undefined;
        let variant: any = current ? toWritableVariant(current) : {};
        if (v.variantId) variant.variant_id = v.variantId;
        if (v.sku !== undefined) variant.sku = v.sku;
        if (v.referenceVariantId !== undefined)
          variant.reference_variant_id = v.referenceVariantId;
        if (v.option1Value !== undefined) variant.option1_value = v.option1Value;
        if (v.option2Value !== undefined) variant.option2_value = v.option2Value;
        if (v.option3Value !== undefined) variant.option3_value = v.option3Value;
        if (v.barcode !== undefined) variant.barcode = v.barcode;
        if (v.cost !== undefined) variant.cost = v.cost;
        if (v.purchaseCost !== undefined) variant.purchase_cost = v.purchaseCost;
        let previousPricingType = variant.default_pricing_type;
        let previousPrice = variant.default_price;
        if (v.defaultPricingType !== undefined) {
          variant.default_pricing_type = v.defaultPricingType;
        } else if (v.defaultPrice !== undefined && v.defaultPrice !== null) {
          variant.default_pricing_type = 'FIXED';
        }
        if (v.defaultPrice !== undefined) variant.default_price = v.defaultPrice;

        // Stores that followed the old defaults follow the new ones too, so a
        // default price change actually reaches the POS.
        let defaultsChanged =
          variant.default_pricing_type !== previousPricingType ||
          variant.default_price !== previousPrice;
        if (defaultsChanged && Array.isArray(variant.stores)) {
          variant.stores = variant.stores.map((store: any) =>
            (store.pricing_type ?? previousPricingType) === previousPricingType &&
            (store.price ?? previousPrice) === previousPrice
              ? {
                  ...store,
                  pricing_type: variant.default_pricing_type,
                  price: variant.default_price
                }
              : store
          );
        }

        if (v.stores) {
          let stores: any[] = Array.isArray(variant.stores) ? [...variant.stores] : [];
          for (let s of v.stores) {
            let index = stores.findIndex(store => store.store_id === s.storeId);
            let store: any = index >= 0 ? { ...stores[index] } : { store_id: s.storeId };
            if (s.pricingType !== undefined) store.pricing_type = s.pricingType;
            else if (s.price !== undefined && s.price !== null) store.pricing_type = 'FIXED';
            if (s.price !== undefined) store.price = s.price;
            if (s.availableForSale !== undefined)
              store.available_for_sale = s.availableForSale;
            if (s.optimalStock !== undefined) store.optimal_stock = s.optimalStock;
            if (s.lowStock !== undefined) store.low_stock = s.lowStock;
            if (index >= 0) stores[index] = store;
            else stores.push(store);
          }
          variant.stores = stores;
        }
        return variant;
      });

      let keptVariants = existingVariants
        .filter(ev => !listedIds.has(ev.variant_id))
        .map(toWritableVariant);

      body.variants = [...keptVariants, ...updatedVariants];
    } else if (isUpdate && existingVariants.length > 0) {
      body.variants = existingVariants.map(toWritableVariant);
    }

    let result = await client.createOrUpdateItem(body);
    let variants = (result.variants ?? []).map((v: any) => ({
      variantId: v.variant_id,
      sku: v.sku,
      defaultPrice: v.default_price
    }));

    return {
      output: {
        itemId: result.id,
        itemName: result.item_name,
        variantCount: variants.length,
        variants,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: `${isUpdate ? 'Updated' : 'Created'} item **${result.item_name}** with ${variants.length} variant(s).`
    };
  })
  .build();
