import { SlateTool } from 'slates';
import { z } from 'zod';
import { finagoServiceError, requireInput, requireUpdateFields } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import {
  getNumber,
  getString,
  isRecord,
  mergeAdditionalFields,
  objectWithDefined
} from '../lib/records';
import { spec } from '../spec';
import { additionalFieldsSchema, maxPagesSchema } from './shared';

let nullableString = (description: string, maxLength?: number) => {
  let schema = maxLength === undefined ? z.string() : z.string().max(maxLength);
  return schema.nullable().optional().describe(description);
};

let nullableNumber = (description: string) =>
  z.number().nullable().optional().describe(description);

let productSchema = z.object({
  productId: z.number().optional().describe('Finago product ID.'),
  name: z.string().optional().describe('Product name.'),
  number: z.string().optional().describe('Product number.'),
  status: z.string().optional().describe('Product status.'),
  type: z.string().optional().describe('Product type.'),
  description: z.string().optional().describe('Product description.'),
  categoryId: z.number().optional().describe('Product category ID.'),
  unitId: z.number().optional().describe('Product unit ID.'),
  supplierId: z.number().optional().describe('Supplier customer ID.'),
  salesPrice: z.number().optional().describe('Sales price.'),
  costPrice: z.number().optional().describe('Cost price.'),
  indirectCost: z.number().optional().describe('Indirect cost.'),
  webshopEnabled: z.boolean().optional().describe('Whether webshop sales are enabled.'),
  ean: z.string().optional().describe('GTIN/EAN.'),
  eanAlternative: z.string().optional().describe('Alternative EAN/article number.'),
  stockManaged: z.boolean().optional().describe('Whether Finago manages stock quantity.'),
  stockQuantity: z.number().optional().describe('Stock quantity if returned.'),
  stockLocation: z.string().optional().describe('Stock location identifier.'),
  supplierProductItemCode: z.string().optional().describe('Supplier product item code.'),
  supplierProductNumber: z.string().optional().describe('Supplier product number.'),
  supplierProductName: z.string().optional().describe('Supplier product name.'),
  supplierProductPrice: z.number().optional().describe('Supplier product price.'),
  createdAt: z.string().optional().describe('Created timestamp.'),
  modifiedAt: z.string().optional().describe('Modified timestamp.'),
  record: z.unknown().describe('Raw Finago product record.')
});

let nestedNumber = (record: unknown, parent: string, key: string) => {
  if (!isRecord(record) || !isRecord(record[parent])) return undefined;
  let value = record[parent][key];
  return typeof value === 'number' ? value : undefined;
};

let nestedString = (record: unknown, parent: string, key: string) => {
  if (!isRecord(record) || !isRecord(record[parent])) return undefined;
  let value = record[parent][key];
  return typeof value === 'string' ? value : undefined;
};

let nestedBoolean = (record: unknown, parent: string, key: string) => {
  if (!isRecord(record) || !isRecord(record[parent])) return undefined;
  let value = record[parent][key];
  return typeof value === 'boolean' ? value : undefined;
};

let mapProduct = (record: unknown) => ({
  productId: getNumber(record, 'id'),
  name: getString(record, 'name'),
  number: getString(record, 'number'),
  status: getString(record, 'status'),
  type: getString(record, 'type'),
  description: getString(record, 'description'),
  categoryId: nestedNumber(record, 'category', 'id'),
  unitId: nestedNumber(record, 'units', 'id'),
  supplierId: nestedNumber(record, 'supplier', 'id'),
  salesPrice: getNumber(record, 'salesPrice'),
  costPrice: getNumber(record, 'costPrice'),
  indirectCost: getNumber(record, 'indirectCost'),
  webshopEnabled:
    isRecord(record) && typeof record.webshopEnabled === 'boolean'
      ? record.webshopEnabled
      : undefined,
  ean: getString(record, 'ean'),
  eanAlternative: getString(record, 'eanAlternative'),
  stockManaged: nestedBoolean(record, 'stock', 'isManaged'),
  stockQuantity: nestedNumber(record, 'stock', 'quantity'),
  stockLocation: nestedString(record, 'stock', 'location'),
  supplierProductItemCode: nestedString(record, 'supplierProduct', 'itemCode'),
  supplierProductNumber: nestedString(record, 'supplierProduct', 'number'),
  supplierProductName: nestedString(record, 'supplierProduct', 'name'),
  supplierProductPrice: nestedNumber(record, 'supplierProduct', 'price'),
  createdAt: getString(record, 'createdAt'),
  modifiedAt: getString(record, 'modifiedAt'),
  record
});

let productIdListFilter = (value: string | undefined, label: string) => {
  if (value === undefined) return undefined;

  let ids = value.split(',').map(item => item.trim());
  if (ids.some(id => !/^[1-9]\d*$/.test(id))) {
    throw finagoServiceError(
      `${label} must be a comma-separated list of positive integer IDs.`
    );
  }

  return ids.join(',');
};

let rejectProductIdListFilters = (input: {
  page?: number;
  limit?: number;
  productSearch?: string;
  categoryIds?: string;
  supplierIds?: string;
  productNumber?: string;
  maxPages?: number;
}) => {
  let listFilters = Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);

  if (listFilters.length > 0) {
    throw finagoServiceError(
      `productId cannot be combined with list filters: ${listFilters.join(', ')}.`
    );
  }
};

type ProductBodyInput = {
  name?: string | null;
  number?: string | null;
  type?: 'default' | 'structure';
  status?: 'active' | 'inactive';
  description?: string | null;
  costPrice?: number | null;
  salesPrice?: number | null;
  indirectCost?: number | null;
  webshopEnabled?: boolean;
  categoryId?: number;
  unitId?: number | null;
  supplierId?: number | null;
  ean?: string | null;
  eanAlternative?: string | null;
  stockManaged?: boolean;
  stockQuantity?: number;
  stockLocation?: string | null;
  supplierProductItemCode?: string | null;
  supplierProductNumber?: string | null;
  supplierProductName?: string | null;
  supplierProductPrice?: number | null;
  additionalFields?: Record<string, unknown>;
};

let compactRecord = (record: Record<string, unknown>) => {
  let compacted = objectWithDefined(record);
  return Object.keys(compacted).length > 0 ? compacted : undefined;
};

let hasText = (value: string | null | undefined) =>
  typeof value === 'string' && value.trim().length > 0;

let productBody = (input: ProductBodyInput) => {
  let body: Record<string, unknown> = objectWithDefined({
    name: input.name,
    number: input.number,
    type: input.type,
    status: input.status,
    description: input.description,
    costPrice: input.costPrice,
    salesPrice: input.salesPrice,
    indirectCost: input.indirectCost,
    webshopEnabled: input.webshopEnabled,
    ean: input.ean,
    eanAlternative: input.eanAlternative
  });

  if (input.categoryId !== undefined) body.category = { id: input.categoryId };
  if (input.unitId !== undefined) body.units = { id: input.unitId };
  if (input.supplierId !== undefined) body.supplier = { id: input.supplierId };
  if (
    input.stockManaged !== undefined ||
    input.stockQuantity !== undefined ||
    input.stockLocation !== undefined
  ) {
    body.stock = compactRecord({
      isManaged: input.stockManaged,
      quantity: input.stockQuantity,
      location: input.stockLocation
    });
  }
  if (
    input.supplierProductItemCode !== undefined ||
    input.supplierProductNumber !== undefined ||
    input.supplierProductName !== undefined ||
    input.supplierProductPrice !== undefined
  ) {
    body.supplierProduct = compactRecord({
      itemCode: input.supplierProductItemCode,
      number: input.supplierProductNumber,
      name: input.supplierProductName,
      price: input.supplierProductPrice
    });
  }

  return mergeAdditionalFields(body, input.additionalFields);
};

let validateProductCreateInput = (input: ProductBodyInput & { productId?: number }) => {
  if (input.productId !== undefined) {
    throw finagoServiceError('productId is only used when updating a product.');
  }
  if (!hasText(input.name)) {
    throw finagoServiceError('name is required when creating a product.');
  }
  if (input.categoryId === undefined) {
    throw finagoServiceError('categoryId is required when creating a product.');
  }
};

let validateProductUpdateInput = (input: ProductBodyInput & { productId?: number }) => {
  requireInput(input.productId, 'productId');
};

export let finagoListProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'finago_list_products',
  description:
    'List Finago products with search, product number, category, supplier, and pagination filters. Use categories, units, and price lists from reference data before creating products.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      productId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Read one product by ID instead of listing products. Do not combine with list filters.'
        ),
      page: z.number().int().positive().optional().describe('Page number.'),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Page size. Finago defaults to 25.'),
      productSearch: z
        .string()
        .optional()
        .describe('Search product number, name, supplier product number, and supplier name.'),
      categoryIds: z
        .string()
        .optional()
        .describe('Comma-separated positive integer product category IDs.'),
      supplierIds: z
        .string()
        .optional()
        .describe('Comma-separated positive integer supplier IDs.'),
      productNumber: z.string().optional().describe('Filter by product number.'),
      maxPages: maxPagesSchema
    })
  )
  .output(
    z.object({
      products: z.array(productSchema).describe('Products returned by Finago.'),
      count: z.number().describe('Number of products returned.'),
      pageCount: z.number().optional(),
      hasNextPage: z.boolean().optional(),
      nextLink: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.productId !== undefined) {
      rejectProductIdListFilters({
        page: ctx.input.page,
        limit: ctx.input.limit,
        productSearch: ctx.input.productSearch,
        categoryIds: ctx.input.categoryIds,
        supplierIds: ctx.input.supplierIds,
        productNumber: ctx.input.productNumber,
        maxPages: ctx.input.maxPages
      });
    }

    let categoryIds = productIdListFilter(ctx.input.categoryIds, 'categoryIds');
    let supplierIds = productIdListFilter(ctx.input.supplierIds, 'supplierIds');
    let client = createClientFromContext(ctx);
    let result =
      ctx.input.productId !== undefined
        ? {
            records: [
              await client.get(`/products/${ctx.input.productId}`, undefined, 'read product')
            ],
            pageCount: 1,
            hasNextPage: false,
            nextLink: undefined
          }
        : await client.list(
            '/products',
            {
              page: ctx.input.page,
              limit: ctx.input.limit,
              productSearch: ctx.input.productSearch,
              categoryIds,
              supplierIds,
              productNumber: ctx.input.productNumber
            },
            ctx.input.maxPages ?? 1,
            'list products'
          );
    let products = result.records.map(mapProduct);

    return {
      output: {
        products,
        count: products.length,
        pageCount: result.pageCount,
        hasNextPage: result.hasNextPage,
        nextLink: result.nextLink
      },
      message: `Retrieved **${products.length}** Finago product(s).`
    };
  })
  .build();

export let finagoUpsertProduct = SlateTool.create(spec, {
  name: 'Upsert Product',
  key: 'finago_upsert_product',
  description:
    'Create or update a Finago product. Creating a product requires a name and categoryId; updating requires productId and at least one product field.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      operation: z.enum(['create', 'update']).describe('Create a product or update one.'),
      productId: z.number().int().positive().optional().describe('Required for update.'),
      name: z.string().max(150).optional().describe('Product name. Required for create.'),
      number: nullableString('Product number. Send null on update to clear.', 100),
      type: z.enum(['default', 'structure']).optional().describe('Product type.'),
      status: z.enum(['active', 'inactive']).optional().describe('Product status.'),
      description: nullableString('Product description. Send null on update to clear.', 500),
      costPrice: nullableNumber('Cost price. Send null on update to clear.'),
      salesPrice: nullableNumber('Sales price. Send null on update to clear.'),
      indirectCost: nullableNumber('Indirect cost. Send null on update to clear.'),
      webshopEnabled: z.boolean().optional().describe('Whether webshop sales are enabled.'),
      categoryId: z.number().int().positive().optional().describe('Product category ID.'),
      unitId: z
        .number()
        .int()
        .positive()
        .nullable()
        .optional()
        .describe('Product unit ID. Send null on update to clear.'),
      supplierId: z
        .number()
        .int()
        .positive()
        .nullable()
        .optional()
        .describe('Supplier customer ID. Send null on update to clear.'),
      ean: nullableString('GTIN/EAN. Send null on update to clear.', 14),
      eanAlternative: nullableString(
        'Alternative EAN/article number. Send null on update to clear.',
        25
      ),
      stockManaged: z.boolean().optional().describe('Whether Finago manages stock quantity.'),
      stockQuantity: z.number().optional().describe('Stock quantity.'),
      stockLocation: nullableString(
        'Stock location identifier. Send null on update to clear.'
      ),
      supplierProductItemCode: nullableString(
        'Supplier product item code. Send null on update to clear.',
        50
      ),
      supplierProductNumber: nullableString(
        'Supplier product number. Send null on update to clear.',
        50
      ),
      supplierProductName: nullableString(
        'Supplier product name. Send null on update to clear.',
        250
      ),
      supplierProductPrice: nullableNumber(
        'Supplier product price. Send null on update to clear.'
      ),
      additionalFields: additionalFieldsSchema
    })
  )
  .output(productSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    if (ctx.input.operation === 'create') {
      validateProductCreateInput(ctx.input);
    } else {
      validateProductUpdateInput(ctx.input);
    }

    let body = productBody(ctx.input);
    if (ctx.input.operation === 'update') {
      requireUpdateFields(body, 'product');
    }

    let record =
      ctx.input.operation === 'create'
        ? await client.post('/products', body, undefined, 'create product')
        : await client.patch(
            `/products/${ctx.input.productId}`,
            body,
            undefined,
            'update product'
          );
    let output = mapProduct(record);

    return {
      output,
      message: `${ctx.input.operation === 'create' ? 'Created' : 'Updated'} Finago product **${output.name ?? output.productId ?? 'unknown'}**.`
    };
  })
  .build();
