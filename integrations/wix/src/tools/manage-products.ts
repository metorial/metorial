import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

let productOptionSchema = z
  .object({
    name: z.string().describe('Option name, e.g. "Size" or "Color"'),
    choices: z
      .array(
        z.object({
          value: z.string().describe('Choice value, e.g. "S", "M", "L"'),
          description: z.string().optional().describe('Choice description')
        })
      )
      .optional()
      .describe('Available choices for this option')
  })
  .describe('Product option with its choices');

let priceDataSchema = z
  .object({
    price: z.number().describe('Product price'),
    discountedPrice: z.number().optional().describe('Discounted price if on sale'),
    currency: z.string().optional().describe('Currency code, e.g. "USD"')
  })
  .describe('Pricing information for the product');

export let manageProducts = SlateTool.create(spec, {
  name: 'Manage Products',
  key: 'manage_products',
  description: `Create, update, delete, or retrieve products from a Wix Store catalog.
Use **action** to specify the operation: \`get\`, \`list\`, \`create\`, \`update\`, or \`delete\`.
For listing, supports filtering and pagination. Products include name, pricing, description, inventory, and variant information.
Supports Wix Stores Catalog V1 and Catalog V3; use \`catalogVersion: "auto"\` to detect the site's catalog version before the product call.`,
  instructions: [
    'For "list" action, use filter with JSON filter expressions compatible with the Wix Query Language.',
    'For "update" action, only include fields you want to change.',
    'Use productData for raw Wix product fields, especially Catalog V3 fields that are not represented by the simplified inputs.',
    'Currently only physical products can be created through the simplified product fields.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'list', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      catalogVersion: z
        .enum(['v1', 'v3', 'auto'])
        .optional()
        .describe(
          'Wix Stores Catalog version to use. Defaults to v1 for backwards compatibility; use auto to call the Catalog Versioning API first.'
        ),
      productId: z
        .string()
        .optional()
        .describe('Product ID (required for get, update, delete)'),
      productData: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Raw Wix product object fields to merge into create/update requests. Useful for Catalog V3 product fields.'
        ),
      name: z.string().optional().describe('Product name (for create/update)'),
      productType: z
        .enum(['physical', 'digital'])
        .optional()
        .describe('Product type (for create, defaults to physical)'),
      description: z.string().optional().describe('Product description (for create/update)'),
      priceData: priceDataSchema
        .optional()
        .describe('Product pricing data (for create/update)'),
      sku: z.string().optional().describe('Stock keeping unit (for create/update)'),
      visible: z
        .boolean()
        .optional()
        .describe('Whether product is visible to visitors (for create/update)'),
      ribbon: z
        .string()
        .optional()
        .describe('Product ribbon text like "Sale" or "New" (for create/update)'),
      brand: z.string().optional().describe('Product brand (for create/update)'),
      weight: z.number().optional().describe('Product weight (for create/update)'),
      productOptions: z
        .array(productOptionSchema)
        .optional()
        .describe('Product options like Size/Color (for create/update)'),
      manageVariants: z
        .boolean()
        .optional()
        .describe('Whether to manage variants (for create/update)'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter object for list action'),
      sort: z
        .array(
          z.object({
            fieldName: z.string(),
            order: z.enum(['ASC', 'DESC'])
          })
        )
        .optional()
        .describe('Sort specification for list action'),
      limit: z.number().optional().describe('Max items to return (for list, default 50)'),
      offset: z.number().optional().describe('Number of items to skip (for list)')
    })
  )
  .output(
    z.object({
      product: z.any().optional().describe('Single product data'),
      products: z.array(z.any()).optional().describe('List of products'),
      totalResults: z.number().optional().describe('Total number of matching products'),
      catalogVersion: z.string().optional().describe('Catalog version used for the request')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);
    let catalogVersion = ctx.input.catalogVersion || 'v1';

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.productId)
          throw createApiServiceError('productId is required for get action');
        let result = await client.getProduct(ctx.input.productId, catalogVersion);
        return {
          output: { product: result.product, catalogVersion: result.catalogVersion },
          message: `Retrieved product **${result.product?.name || ctx.input.productId}**`
        };
      }
      case 'list': {
        let result = await client.queryProducts(
          {
            filter: ctx.input.filter,
            sort: ctx.input.sort,
            paging: { limit: ctx.input.limit, offset: ctx.input.offset }
          },
          catalogVersion
        );
        let products = result.products || [];
        return {
          output: {
            products,
            totalResults: result.totalResults || result.pagingMetadata?.total,
            catalogVersion: result.catalogVersion
          },
          message: `Found **${products.length}** products${result.totalResults ? ` out of ${result.totalResults} total` : ''}`
        };
      }
      case 'create': {
        let productData: Record<string, any> = { ...(ctx.input.productData || {}) };
        if (ctx.input.name) productData.name = ctx.input.name;
        if (ctx.input.productType) productData.productType = ctx.input.productType;
        if (ctx.input.description) productData.description = ctx.input.description;
        if (ctx.input.priceData) productData.priceData = ctx.input.priceData;
        if (ctx.input.sku) productData.sku = ctx.input.sku;
        if (ctx.input.visible !== undefined) productData.visible = ctx.input.visible;
        if (ctx.input.ribbon) productData.ribbon = ctx.input.ribbon;
        if (ctx.input.brand) productData.brand = ctx.input.brand;
        if (ctx.input.weight !== undefined) productData.weight = ctx.input.weight;
        if (ctx.input.productOptions) productData.productOptions = ctx.input.productOptions;
        if (ctx.input.manageVariants !== undefined)
          productData.manageVariants = ctx.input.manageVariants;
        let result = await client.createProduct(productData, catalogVersion);
        return {
          output: { product: result.product, catalogVersion: result.catalogVersion },
          message: `Created product **${result.product?.name}** (ID: ${result.product?.id})`
        };
      }
      case 'update': {
        if (!ctx.input.productId)
          throw createApiServiceError('productId is required for update action');
        let productData: Record<string, any> = { ...(ctx.input.productData || {}) };
        if (ctx.input.name) productData.name = ctx.input.name;
        if (ctx.input.description) productData.description = ctx.input.description;
        if (ctx.input.priceData) productData.priceData = ctx.input.priceData;
        if (ctx.input.sku) productData.sku = ctx.input.sku;
        if (ctx.input.visible !== undefined) productData.visible = ctx.input.visible;
        if (ctx.input.ribbon) productData.ribbon = ctx.input.ribbon;
        if (ctx.input.brand) productData.brand = ctx.input.brand;
        if (ctx.input.weight !== undefined) productData.weight = ctx.input.weight;
        if (ctx.input.productOptions) productData.productOptions = ctx.input.productOptions;
        if (ctx.input.manageVariants !== undefined)
          productData.manageVariants = ctx.input.manageVariants;
        let result = await client.updateProduct(
          ctx.input.productId,
          productData,
          catalogVersion
        );
        return {
          output: { product: result.product, catalogVersion: result.catalogVersion },
          message: `Updated product **${result.product?.name || ctx.input.productId}**`
        };
      }
      case 'delete': {
        if (!ctx.input.productId)
          throw createApiServiceError('productId is required for delete action');
        let result = await client.deleteProduct(ctx.input.productId, catalogVersion);
        return {
          output: { catalogVersion: result.catalogVersion },
          message: `Deleted product **${ctx.input.productId}**`
        };
      }
    }
  })
  .build();
