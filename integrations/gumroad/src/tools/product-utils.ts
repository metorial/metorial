import { z } from 'zod';

export let productSchema = z.object({
  productId: z.string().describe('Unique product ID'),
  name: z.string().describe('Product name'),
  permalink: z.string().optional().describe('Product permalink/slug'),
  description: z.string().optional().describe('Product description'),
  published: z.boolean().optional().describe('Whether the product is published'),
  deleted: z.boolean().optional().describe('Whether the product has been deleted'),
  priceCents: z.number().optional().describe('Product price in cents'),
  currency: z.string().optional().describe('Currency code'),
  category: z.string().optional().describe('Full Gumroad category path'),
  categoryLabel: z.string().optional().describe('Human-readable category label'),
  taxonomyId: z.number().optional().describe('Numeric Gumroad category ID'),
  url: z.string().optional().describe('Gumroad product URL'),
  shortUrl: z.string().optional().describe('Short URL for the product'),
  thumbnailUrl: z.string().optional().describe('Product thumbnail URL'),
  salesCount: z.number().optional().describe('Total number of sales'),
  salesUsdCents: z.number().optional().describe('Total sales revenue in USD cents'),
  tags: z.array(z.string()).optional().describe('Product tags'),
  customFields: z
    .array(z.any())
    .optional()
    .describe('Custom fields configured on the product'),
  variantCategories: z.array(z.any()).optional().describe('Variant categories and options'),
  files: z.array(z.any()).optional().describe('Files attached to the product'),
  richContent: z.array(z.any()).optional().describe('Product rich content pages')
});

export let mapProduct = (product: any) => ({
  productId: product.id,
  name: product.name || '',
  permalink: product.permalink || undefined,
  description: product.description || undefined,
  published: product.published,
  deleted: product.deleted,
  priceCents: product.price,
  currency: product.currency,
  category: product.category || undefined,
  categoryLabel: product.category_label || undefined,
  taxonomyId: product.taxonomy_id ?? undefined,
  url: product.url || undefined,
  shortUrl: product.short_url || undefined,
  thumbnailUrl: product.thumbnail_url || undefined,
  salesCount: product.sales_count,
  salesUsdCents: product.sales_usd_cents,
  tags: product.tags || undefined,
  customFields: product.custom_fields || undefined,
  variantCategories: product.variant_categories || product.variants || undefined,
  files: product.files || undefined,
  richContent: product.rich_content || undefined
});
