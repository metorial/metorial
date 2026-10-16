import { z } from 'zod';

export let variantStoreSchema = z.object({
  storeId: z.string().describe('Store ID'),
  pricingType: z.string().nullable().optional().describe('FIXED or VARIABLE pricing'),
  price: z.number().nullable().optional().describe('Price in this store (FIXED pricing)'),
  availableForSale: z.boolean().nullable().optional().describe('Available for sale here'),
  optimalStock: z.number().nullable().optional().describe('Optimal stock in this store'),
  lowStock: z.number().nullable().optional().describe('Low stock alert threshold')
});

export let variantSchema = z.object({
  variantId: z.string().describe('Unique ID of the variant'),
  itemId: z.string().nullable().optional().describe('ID of the parent item'),
  sku: z.string().nullable().optional().describe('SKU code'),
  referenceVariantId: z.string().nullable().optional().describe('Reference variant ID'),
  option1Value: z.string().nullable().optional().describe('First option value'),
  option2Value: z.string().nullable().optional().describe('Second option value'),
  option3Value: z.string().nullable().optional().describe('Third option value'),
  barcode: z.string().nullable().optional().describe('Barcode'),
  cost: z.number().nullable().optional().describe('Cost price'),
  purchaseCost: z.number().nullable().optional().describe('Purchase cost'),
  defaultPricingType: z
    .string()
    .nullable()
    .optional()
    .describe('Default pricing type (FIXED or VARIABLE)'),
  defaultPrice: z.number().nullable().optional().describe('Default selling price'),
  storesAvailability: z
    .array(variantStoreSchema)
    .optional()
    .describe('Store-specific pricing and availability'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  deletedAt: z.string().nullable().optional().describe('Deletion timestamp')
});

export let itemSchema = z.object({
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
  components: z
    .array(
      z.object({
        variantId: z.string().nullable().optional().describe('Component variant ID'),
        quantity: z.number().nullable().optional().describe('Component quantity')
      })
    )
    .optional()
    .describe('Components of a composite item'),
  primarySupplierId: z.string().nullable().optional().describe('Primary supplier ID'),
  taxIds: z.array(z.string()).optional().describe('Applied tax IDs'),
  modifierIds: z.array(z.string()).optional().describe('Applied modifier IDs'),
  form: z.string().nullable().optional().describe('Item shape on the POS'),
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

export let mapVariant = (v: any): z.infer<typeof variantSchema> => ({
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
  defaultPricingType: v.default_pricing_type,
  defaultPrice: v.default_price,
  storesAvailability: v.stores?.map((s: any) => ({
    storeId: s.store_id,
    pricingType: s.pricing_type,
    price: s.price,
    availableForSale: s.available_for_sale,
    optimalStock: s.optimal_stock,
    lowStock: s.low_stock
  })),
  createdAt: v.created_at,
  updatedAt: v.updated_at,
  deletedAt: v.deleted_at
});

export let mapItem = (item: any): z.infer<typeof itemSchema> => ({
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
  components: item.components?.map((c: any) => ({
    variantId: c.variant_id,
    quantity: c.quantity
  })),
  primarySupplierId: item.primary_supplier_id,
  taxIds: item.tax_ids ?? undefined,
  modifierIds: item.modifiers_ids ?? item.modifier_ids ?? undefined,
  form: item.form,
  color: item.color,
  imageUrl: item.image_url,
  option1Name: item.option1_name,
  option2Name: item.option2_name,
  option3Name: item.option3_name,
  variants: item.variants?.map(mapVariant),
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  deletedAt: item.deleted_at
});

// Writable fields of an existing variant, used to keep variants intact when an
// item is updated without an explicit variants list.
export let toWritableVariant = (v: any) => {
  let variant: Record<string, unknown> = {};
  for (let key of [
    'variant_id',
    'sku',
    'reference_variant_id',
    'option1_value',
    'option2_value',
    'option3_value',
    'barcode',
    'cost',
    'purchase_cost',
    'default_pricing_type',
    'default_price'
  ]) {
    if (v[key] !== undefined && v[key] !== null) variant[key] = v[key];
  }
  if (Array.isArray(v.stores)) {
    variant.stores = v.stores.map((s: any) => {
      let store: Record<string, unknown> = {};
      for (let key of [
        'store_id',
        'pricing_type',
        'price',
        'available_for_sale',
        'optimal_stock',
        'low_stock'
      ]) {
        if (s[key] !== undefined && s[key] !== null) store[key] = s[key];
      }
      return store;
    });
  }
  return variant;
};
