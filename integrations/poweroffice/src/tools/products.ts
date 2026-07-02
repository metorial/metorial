import { SlateTool } from 'slates';
import { z } from 'zod';
import { buildPatch, compact } from '../lib/client';
import { powerOfficeValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  buildListParams,
  compactOutput,
  createClient,
  numberValue,
  pageSummary,
  paginationInputSchema,
  paginationOutputSchema,
  rawRecordSchema,
  stringValue
} from './shared';

let productSchema = z.object({
  id: z.number().optional().describe('PowerOffice product id.'),
  code: z.string().optional().describe('Product code.'),
  name: z.string().optional().describe('Product name.'),
  description: z.string().optional().describe('Product description.'),
  productType: z.string().optional().describe('Product type, usually Product or Service.'),
  productGroupCode: z.string().optional().describe('Product group code.'),
  productGroupId: z.number().optional().describe('Product group id.'),
  unitPrice: z.number().optional().describe('Unit sales price.'),
  unitCost: z.number().optional().describe('Unit cost.'),
  unitOfMeasureCode: z.string().optional().describe('Unit of measure code.'),
  standardSalesAccount: z.number().optional().describe('Standard sales account number.'),
  standardSalesAccountId: z.number().optional().describe('Standard sales account id.'),
  optionalSalesAccount: z.number().optional().describe('Optional sales account number.'),
  optionalSalesAccountId: z.number().optional().describe('Optional sales account id.'),
  stockOnHand: z.number().optional().describe('Stock on hand.'),
  stockAvailable: z.number().optional().describe('Stock available.'),
  isArchived: z.boolean().optional().describe('Whether this product is archived.'),
  isStockItem: z.boolean().optional().describe('Whether stock can be registered.'),
  createdDateTimeOffset: z.string().optional().describe('Created timestamp.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  record: rawRecordSchema
});

let productBodyInputSchema = {
  code: z.string().nullable().optional().describe('Product code.'),
  name: z.string().nullable().optional().describe('Product name. Required for creation.'),
  description: z.string().nullable().optional().describe('Product description.'),
  gtin: z.string().nullable().optional().describe('Global trade item number.'),
  productType: z.enum(['Product', 'Service']).nullable().optional().describe('Product type.'),
  productGroupCode: z.string().nullable().optional().describe('Product group code.'),
  productGroupId: z.number().int().nullable().optional().describe('Product group id.'),
  unitPrice: z.number().nullable().optional().describe('Unit sales price.'),
  unitCost: z.number().nullable().optional().describe('Unit cost.'),
  unitOfMeasureCode: z.string().nullable().optional().describe('Unit of measure code.'),
  standardSalesAccount: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe('Standard sales account number.'),
  standardSalesAccountId: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe('Standard sales account id.'),
  optionalSalesAccount: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe('Optional sales account number.'),
  optionalSalesAccountId: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe('Optional sales account id.'),
  stockOnHand: z.number().nullable().optional().describe('Stock on hand.'),
  isStockItem: z.boolean().nullable().optional().describe('Whether stock can be registered.'),
  isArchived: z.boolean().nullable().optional().describe('Whether this product is archived.')
};

let upsertProductInputSchema = z.object({
  operation: z
    .enum(['create', 'update', 'upsert'])
    .describe('Create a product, update by productId/code, or upsert by productId/code.'),
  productId: z.number().int().optional().describe('PowerOffice product id for update.'),
  lookupCode: z.string().optional().describe('Product code to look up before update/upsert.'),
  ...productBodyInputSchema
});

let mapProduct = (product: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(product, 'Id'),
    code: stringValue(product, 'Code'),
    name: stringValue(product, 'Name'),
    description: stringValue(product, 'Description'),
    productType: stringValue(product, 'ProductType'),
    productGroupCode: stringValue(product, 'ProductGroupCode'),
    productGroupId: numberValue(product, 'ProductGroupId'),
    unitPrice: numberValue(product, 'UnitPrice'),
    unitCost: numberValue(product, 'UnitCost'),
    unitOfMeasureCode: stringValue(product, 'UnitOfMeasureCode'),
    standardSalesAccount: numberValue(product, 'StandardSalesAccount'),
    standardSalesAccountId: numberValue(product, 'StandardSalesAccountId'),
    optionalSalesAccount: numberValue(product, 'OptionalSalesAccount'),
    optionalSalesAccountId: numberValue(product, 'OptionalSalesAccountId'),
    stockOnHand: numberValue(product, 'StockOnHand'),
    stockAvailable: numberValue(product, 'StockAvailable'),
    isArchived:
      typeof product.IsArchived === 'boolean' ? (product.IsArchived as boolean) : undefined,
    isStockItem:
      typeof product.IsStockItem === 'boolean' ? (product.IsStockItem as boolean) : undefined,
    createdDateTimeOffset: stringValue(product, 'CreatedDateTimeOffset'),
    lastChangedDateTimeOffset: stringValue(product, 'LastChangedDateTimeOffset')
  }),
  record: product
});

let buildProductBody = (input: z.infer<typeof upsertProductInputSchema>) =>
  compact({
    Code: input.code,
    Name: input.name,
    Description: input.description,
    Gtin: input.gtin,
    ProductType: input.productType,
    ProductGroupCode: input.productGroupCode,
    ProductGroupId: input.productGroupId,
    UnitPrice: input.unitPrice,
    UnitCost: input.unitCost,
    UnitOfMeasureCode: input.unitOfMeasureCode,
    StandardSalesAccount: input.standardSalesAccount,
    StandardSalesAccountId: input.standardSalesAccountId,
    OptionalSalesAccount: input.optionalSalesAccount,
    OptionalSalesAccountId: input.optionalSalesAccountId,
    StockOnHand: input.stockOnHand,
    IsStockItem: input.isStockItem,
    IsArchived: input.isArchived
  });

let buildProductPatch = (input: z.infer<typeof upsertProductInputSchema>) => {
  if (input.productGroupCode !== undefined) {
    throw powerOfficeValidationError(
      'productGroupCode can only be set when creating a product. Use productGroupId when updating a product.'
    );
  }
  if (input.standardSalesAccount !== undefined) {
    throw powerOfficeValidationError(
      'standardSalesAccount can only be set when creating a product. Use standardSalesAccountId when updating a product.'
    );
  }
  if (input.optionalSalesAccount !== undefined) {
    throw powerOfficeValidationError(
      'optionalSalesAccount can only be set when creating a product. Use optionalSalesAccountId when updating a product.'
    );
  }

  return buildPatch(
    compact({
      Code: input.code,
      Name: input.name,
      Description: input.description,
      Gtin: input.gtin,
      ProductType: input.productType,
      ProductGroupId: input.productGroupId,
      UnitPrice: input.unitPrice,
      UnitCost: input.unitCost,
      UnitOfMeasureCode: input.unitOfMeasureCode,
      StandardSalesAccountId: input.standardSalesAccountId,
      OptionalSalesAccountId: input.optionalSalesAccountId,
      StockOnHand: input.stockOnHand,
      IsStockItem: input.isStockItem,
      IsArchived: input.isArchived
    })
  );
};

let resolveProductId = async (
  client: ReturnType<typeof createClient>,
  input: z.infer<typeof upsertProductInputSchema>
) => {
  if (input.productId !== undefined) return input.productId;

  let code = input.lookupCode ?? input.code;
  if (!code) {
    throw powerOfficeValidationError(
      'Provide productId, lookupCode, or code to update or upsert a product.'
    );
  }

  let matches = await client.listProducts({
    codes: code,
    PageNumber: 1,
    PageSize: 2
  });

  if (matches.length === 0) return undefined;
  if (matches.length > 1) {
    throw powerOfficeValidationError(
      'Product lookup returned multiple matches. Provide productId to update safely.'
    );
  }

  let id = numberValue(matches[0] ?? {}, 'Id');
  if (id === undefined) {
    throw powerOfficeValidationError('Product lookup did not return a PowerOffice id.');
  }

  return id;
};

export let powerofficeListProducts = SlateTool.create(spec, {
  name: 'List PowerOffice Products',
  key: 'poweroffice_list_products',
  description:
    'List and filter PowerOffice products and services by code, name, product group, type, archived state, or changed timestamp.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      codes: z.string().optional().describe('Comma-separated product codes.'),
      names: z.string().optional().describe('Comma-separated product names.'),
      productGroupCodes: z
        .string()
        .optional()
        .describe('Comma-separated product group codes.'),
      type: z.enum(['Product', 'Service']).optional().describe('Product type filter.'),
      isArchived: z.boolean().optional().describe('Filter archived products.'),
      createdDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return products created after this timestamp.'),
      lastChangedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return products changed after this timestamp.'),
      stockOnHandLastChangedDatetimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return products with stock changed after this timestamp.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      products: z.array(productSchema).describe('Products returned by PowerOffice.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let products = await client.listProducts(
      buildListParams(ctx.input, {
        codes: ctx.input.codes,
        createdDateTimeOffsetGreaterThan: ctx.input.createdDateTimeOffsetGreaterThan,
        isArchived: ctx.input.isArchived,
        lastChangedDateTimeOffsetGreaterThan: ctx.input.lastChangedDateTimeOffsetGreaterThan,
        stockOnHandLastChangedDatetimeOffsetGreaterThan:
          ctx.input.stockOnHandLastChangedDatetimeOffsetGreaterThan,
        names: ctx.input.names,
        productGroupCodes: ctx.input.productGroupCodes,
        type: ctx.input.type
      })
    );

    return {
      output: {
        products: products.map(mapProduct),
        page: pageSummary(ctx.input, products.length)
      },
      message: `Retrieved **${products.length}** PowerOffice product(s).`
    };
  })
  .build();

export let powerofficeUpsertProduct = SlateTool.create(spec, {
  name: 'Upsert PowerOffice Product',
  key: 'poweroffice_upsert_product',
  description:
    'Create, update, or idempotently upsert a PowerOffice product or service used in sales order and invoice workflows.',
  instructions: [
    'Use operation "create" when no existing product should be modified.',
    'Use operation "update" with productId when possible. If productId is not available, provide lookupCode or code.',
    'Use operation "upsert" with productId or code to update the match or create a new product.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(upsertProductInputSchema)
  .output(
    z.object({
      operation: z.enum(['created', 'updated']).describe('Operation actually performed.'),
      product: productSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let body = buildProductBody(ctx.input);

    if (ctx.input.operation === 'create') {
      if (!ctx.input.name) {
        throw powerOfficeValidationError('name is required when creating a product.');
      }

      let product = await client.createProduct(body);
      return {
        output: {
          operation: 'created',
          product: mapProduct(product)
        },
        message: `Created PowerOffice product **${stringValue(product, 'Name') ?? stringValue(product, 'Code') ?? numberValue(product, 'Id')}**.`
      };
    }

    let productId = await resolveProductId(client, ctx.input);

    if (productId === undefined) {
      if (ctx.input.operation !== 'upsert') {
        throw powerOfficeValidationError('No PowerOffice product matched the update lookup.');
      }

      if (!ctx.input.name) {
        throw powerOfficeValidationError('name is required when upsert creates a product.');
      }

      let product = await client.createProduct(body);
      return {
        output: {
          operation: 'created',
          product: mapProduct(product)
        },
        message: `Created PowerOffice product **${stringValue(product, 'Name') ?? stringValue(product, 'Code') ?? numberValue(product, 'Id')}**.`
      };
    }

    let product = await client.updateProduct(productId, buildProductPatch(ctx.input));
    return {
      output: {
        operation: 'updated',
        product: mapProduct(product)
      },
      message: `Updated PowerOffice product **${stringValue(product, 'Code') ?? productId}**.`
    };
  })
  .build();
