import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { getNextCursor } from '../lib/client';
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
    discountedPrice: z
      .number()
      .optional()
      .describe(
        'Catalog V3 only: current selling price when the product is on sale; price becomes the strikethrough price. Catalog V1 derives the discounted price from discounts and ignores this.'
      ),
    currency: z
      .string()
      .optional()
      .describe('Ignored by Wix; the site currency is always used.')
  })
  .describe('Pricing information for the product');

type ProductInput = {
  name?: string;
  productType?: 'physical' | 'digital';
  description?: string;
  priceData?: z.infer<typeof priceDataSchema>;
  sku?: string;
  visible?: boolean;
  ribbon?: string;
  brand?: string;
  weight?: number;
  productOptions?: z.infer<typeof productOptionSchema>[];
  manageVariants?: boolean;
};

let buildV1Product = (input: ProductInput, isCreate: boolean) => {
  let product: Record<string, any> = {};
  if (input.name) product.name = input.name;
  if (isCreate && input.productType) product.productType = input.productType;
  if (input.description) product.description = input.description;
  if (input.priceData) product.priceData = { price: input.priceData.price };
  if (input.sku) product.sku = input.sku;
  if (input.visible !== undefined) product.visible = input.visible;
  if (input.ribbon) product.ribbon = input.ribbon;
  if (input.brand) product.brand = input.brand;
  if (input.weight !== undefined) product.weight = input.weight;
  if (input.productOptions) product.productOptions = input.productOptions;
  if (input.manageVariants !== undefined) product.manageVariants = input.manageVariants;
  return product;
};

let v3VariantPrice = (priceData: NonNullable<ProductInput['priceData']>) =>
  priceData.discountedPrice !== undefined && priceData.discountedPrice < priceData.price
    ? {
        actualPrice: { amount: String(priceData.discountedPrice) },
        compareAtPrice: { amount: String(priceData.price) }
      }
    : { actualPrice: { amount: String(priceData.price) } };

let rejectV3Fields = (
  input: ProductInput,
  fields: Array<keyof ProductInput>,
  action: string
) => {
  let used = fields.filter(field => input[field] !== undefined);
  if (used.length > 0) {
    throw createApiServiceError(
      `${used.join(', ')} cannot be used for ${action} on a Catalog V3 store. Pass the Catalog V3 fields (for example options and variantsInfo.variants) in productData instead.`
    );
  }
};

let buildV3CreateProduct = (input: ProductInput, productData: Record<string, any>) => {
  rejectV3Fields(input, ['productOptions', 'manageVariants'], 'create');
  if (productData.variantsInfo) {
    rejectV3Fields(
      input,
      ['priceData', 'sku', 'weight'],
      'create with productData.variantsInfo'
    );
  } else if (!input.priceData) {
    throw createApiServiceError(
      'priceData is required to create a Catalog V3 product unless productData.variantsInfo is given.'
    );
  }

  let productType = input.productType === 'digital' ? 'DIGITAL' : 'PHYSICAL';
  let variant: Record<string, any> = {};
  if (input.priceData) variant.price = v3VariantPrice(input.priceData);
  if (input.sku) variant.sku = input.sku;
  if (productType === 'PHYSICAL') {
    variant.physicalProperties = input.weight !== undefined ? { weight: input.weight } : {};
  }

  let product: Record<string, any> = { productType };
  if (productType === 'PHYSICAL') product.physicalProperties = {};
  if (input.name) product.name = input.name;
  if (input.description) product.plainDescription = input.description;
  if (input.visible !== undefined) product.visible = input.visible;
  if (input.brand) product.brand = { name: input.brand };
  if (input.ribbon) product.ribbon = { name: input.ribbon };
  if (!productData.variantsInfo) product.variantsInfo = { variants: [variant] };

  return { ...product, ...productData };
};

let buildV3UpdateProduct = (input: ProductInput) => {
  rejectV3Fields(
    input,
    ['priceData', 'sku', 'weight', 'productOptions', 'manageVariants', 'brand'],
    'update'
  );

  let product: Record<string, any> = {};
  if (input.name) product.name = input.name;
  if (input.description) product.plainDescription = input.description;
  if (input.visible !== undefined) product.visible = input.visible;
  if (input.ribbon) product.ribbon = { name: input.ribbon };
  return product;
};

export let manageProducts = SlateTool.create(spec, {
  name: 'Manage Products',
  key: 'manage_products',
  description: `Create, update, delete, or retrieve products from a Wix Store catalog.
Use **action** to specify the operation: \`get\`, \`list\`, \`create\`, \`update\`, or \`delete\`.
For listing, supports filtering and pagination. Products include name, pricing, description, inventory, and variant information.
Supports Wix Stores Catalog V1 and Catalog V3. When \`catalogVersion\` is omitted or \`auto\`, the site's catalog version is detected before the product call.`,
  instructions: [
    'For "list", pass filter as a Wix API Query Language object, for example {"name": {"$startsWith": "Shirt"}}. Catalog V3 only supports filtering and sorting on a few fields such as id, slug, visible, createdDate, and updatedDate.',
    'Catalog V1 lists use limit and offset. Catalog V3 lists use limit and cursor; pass nextCursor from the previous response to get the next page.',
    'For "update", only include fields you want to change. On Catalog V3, the current product revision is fetched automatically unless productData.revision is given.',
    'On Catalog V3, simplified fields cover name, description (HTML), visible, ribbon, and for create also priceData, sku, weight, and brand. Use productData for other Catalog V3 fields such as options and variantsInfo.',
    'Catalog V1 creation supports physical products only.'
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
          'Wix Stores Catalog version to use. Omit or use auto to detect the site catalog version first; omitting it falls back to v1 if detection is not permitted.'
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
      description: z
        .string()
        .optional()
        .describe('Product description; HTML is accepted (for create/update)'),
      priceData: priceDataSchema
        .optional()
        .describe('Product pricing data (for create, and update on Catalog V1)'),
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
        .describe('Catalog V1 product options like Size/Color (for create/update)'),
      manageVariants: z
        .boolean()
        .optional()
        .describe('Catalog V1: whether to manage variants (for create/update)'),
      includeHiddenProducts: z
        .boolean()
        .optional()
        .describe(
          'Catalog V1 list: include hidden products. Catalog V3 lists include hidden products when the connection can read them.'
        ),
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
      limit: z.number().optional().describe('Max items to return (for list, max 100)'),
      offset: z
        .number()
        .optional()
        .describe('Number of items to skip (for list on Catalog V1 only)'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor from a previous nextCursor (for list on Catalog V3 only)')
    })
  )
  .output(
    z.object({
      product: z.any().optional().describe('Single product data'),
      products: z.array(z.any()).optional().describe('List of products'),
      totalResults: z.number().optional().describe('Total number of matching products'),
      nextCursor: z
        .string()
        .optional()
        .describe('Cursor for the next page of Catalog V3 results'),
      catalogVersion: z.string().optional().describe('Catalog version used for the request')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);
    let input = ctx.input;
    let catalogVersion = input.catalogVersion;

    switch (input.action) {
      case 'get': {
        if (!input.productId)
          throw createApiServiceError('productId is required for get action');
        let result = await client.getProduct(input.productId, catalogVersion);
        return {
          output: { product: result.product, catalogVersion: result.catalogVersion },
          message: `Retrieved product **${result.product?.name || input.productId}**`
        };
      }
      case 'list': {
        let version = await client.resolveCatalogVersion(catalogVersion);
        if (version === 'v3' && input.offset !== undefined) {
          throw createApiServiceError(
            'Catalog V3 product lists use cursor paging. Remove offset and pass cursor from nextCursor instead.'
          );
        }
        if (version === 'v1' && input.cursor !== undefined) {
          throw createApiServiceError(
            'Catalog V1 product lists use offset paging. Remove cursor and pass offset instead.'
          );
        }
        let result = await client.queryProducts(
          {
            filter: input.filter,
            sort: input.sort,
            limit: input.limit,
            offset: input.offset,
            cursor: input.cursor,
            includeHiddenProducts: input.includeHiddenProducts
          },
          version
        );
        let products = result.products || [];
        let totalResults =
          typeof result.totalResults === 'number' ? result.totalResults : undefined;
        return {
          output: {
            products,
            totalResults,
            nextCursor: getNextCursor(result),
            catalogVersion: result.catalogVersion
          },
          message: `Found **${products.length}** products${totalResults ? ` out of ${totalResults} total` : ''}`
        };
      }
      case 'create': {
        let version = await client.resolveCatalogVersion(catalogVersion);
        let productData = input.productData || {};
        let product =
          version === 'v3'
            ? buildV3CreateProduct(input, productData)
            : { ...productData, ...buildV1Product(input, true) };
        let result = await client.createProduct(product, version);
        return {
          output: { product: result.product, catalogVersion: result.catalogVersion },
          message: `Created product **${result.product?.name}** (ID: ${result.product?.id})`
        };
      }
      case 'update': {
        if (!input.productId)
          throw createApiServiceError('productId is required for update action');
        let version = await client.resolveCatalogVersion(catalogVersion);
        let productData = input.productData || {};
        let product: Record<string, any>;
        if (version === 'v3') {
          product = { ...buildV3UpdateProduct(input), ...productData };
          if (product.revision === undefined) {
            let current = await client.getProduct(input.productId, 'v3');
            product.revision = current.product?.revision;
          }
        } else {
          product = { ...productData, ...buildV1Product(input, false) };
        }
        let result = await client.updateProduct(input.productId, product, version);
        return {
          output: { product: result.product, catalogVersion: result.catalogVersion },
          message: `Updated product **${result.product?.name || input.productId}**`
        };
      }
      case 'delete': {
        if (!input.productId)
          throw createApiServiceError('productId is required for delete action');
        let result = await client.deleteProduct(input.productId, catalogVersion);
        return {
          output: { catalogVersion: result.catalogVersion },
          message: `Deleted product **${input.productId}**`
        };
      }
    }
  })
  .build();
