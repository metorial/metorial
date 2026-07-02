import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  andFilters,
  odataStringLiteral,
  orFilters,
  type SapS4HanaClient,
  substringFilter
} from '../lib/client';
import { spec } from '../spec';
import {
  compactOutput,
  createClient,
  ensureFilteredQuery,
  navigationArray,
  pageInputSchema,
  pageOutputSchema,
  pageSummary,
  rawRecordSchema,
  stringValue,
  topValue
} from './shared';

const serviceName = 'API_PRODUCT_SRV';

let productDescriptionSchema = z.object({
  language: z.string().optional().describe('Language code.'),
  description: z.string().optional().describe('Product description.'),
  record: rawRecordSchema
});

let productPlantSchema = z.object({
  plant: z.string().optional().describe('Plant.'),
  procurementType: z.string().optional().describe('Procurement type.'),
  mrpType: z.string().optional().describe('MRP type.'),
  record: rawRecordSchema
});

let productSalesSchema = z.object({
  salesOrganization: z.string().optional().describe('Sales organization.'),
  distributionChannel: z.string().optional().describe('Distribution channel.'),
  record: rawRecordSchema
});

let productSchema = z.object({
  product: z.string().optional().describe('SAP product/material id.'),
  productType: z.string().optional().describe('Product/material type.'),
  baseUnit: z.string().optional().describe('Base unit of measure.'),
  productGroup: z.string().optional().describe('Product group.'),
  crossPlantStatus: z.string().optional().describe('Cross-plant product status.'),
  description: z.string().optional().describe('Primary product description when expanded.'),
  descriptions: z
    .array(productDescriptionSchema)
    .optional()
    .describe('Expanded descriptions.'),
  plants: z.array(productPlantSchema).optional().describe('Expanded plant metadata.'),
  sales: z.array(productSalesSchema).optional().describe('Expanded sales metadata.'),
  record: rawRecordSchema
});

let mapProductDescription = (description: Record<string, unknown>) => ({
  ...compactOutput({
    language: stringValue(description, 'Language'),
    description: stringValue(description, 'ProductDescription')
  }),
  record: description
});

let mapProductPlant = (plant: Record<string, unknown>) => ({
  ...compactOutput({
    plant: stringValue(plant, 'Plant'),
    procurementType: stringValue(plant, 'ProcurementType'),
    mrpType: stringValue(plant, 'MRPType')
  }),
  record: plant
});

export let mapProductSales = (sales: Record<string, unknown>) => ({
  ...compactOutput({
    salesOrganization:
      stringValue(sales, 'ProductSalesOrg') ?? stringValue(sales, 'SalesOrganization'),
    distributionChannel:
      stringValue(sales, 'ProductDistributionChnl') ??
      stringValue(sales, 'DistributionChannel')
  }),
  record: sales
});

let mapProduct = (product: Record<string, unknown>) => {
  let descriptions = navigationArray(product, 'to_Description').map(mapProductDescription);
  let plants = navigationArray(product, 'to_Plant').map(mapProductPlant);
  let sales =
    navigationArray(product, 'to_SalesDelivery').length > 0
      ? navigationArray(product, 'to_SalesDelivery').map(mapProductSales)
      : navigationArray(product, 'to_Sales').map(mapProductSales);

  return {
    ...compactOutput({
      product: stringValue(product, 'Product'),
      productType: stringValue(product, 'ProductType'),
      baseUnit: stringValue(product, 'BaseUnit'),
      productGroup: stringValue(product, 'ProductGroup'),
      crossPlantStatus: stringValue(product, 'CrossPlantStatus'),
      description: descriptions[0]?.description,
      descriptions: descriptions.length > 0 ? descriptions : undefined,
      plants: plants.length > 0 ? plants : undefined,
      sales: sales.length > 0 ? sales : undefined
    }),
    record: product
  };
};

type ProductFilterInput = {
  product?: string;
  description?: string;
  productType?: string;
  plant?: string;
  salesOrg?: string;
};

type ProductFilterClient = Pick<SapS4HanaClient, 'queryEntityIds'>;

let noProductMatchFilter = `Product eq ${odataStringLiteral('__slates_no_product_match__')}`;
let productFilterIdLimit = 100;

let productIdFilter = (productIds: string[]) => {
  let uniqueProductIds = [...new Set(productIds)];
  if (uniqueProductIds.length === 0) return noProductMatchFilter;

  return orFilters(
    uniqueProductIds.map(productId => `Product eq ${odataStringLiteral(productId)}`)
  );
};

let queryProductIds = async (client: ProductFilterClient, entitySet: string, filter: string) =>
  client.queryEntityIds({
    serviceName,
    entitySet,
    idField: 'Product',
    filter,
    top: productFilterIdLimit
  });

export let buildProductFilters = async (
  input: ProductFilterInput,
  client: ProductFilterClient
) => {
  let descriptionProductIds = input.description
    ? await queryProductIds(
        client,
        'A_ProductDescription',
        substringFilter('ProductDescription', input.description)
      )
    : [];

  let plantProductIds = input.plant
    ? await queryProductIds(
        client,
        'A_ProductPlant',
        `Plant eq ${odataStringLiteral(input.plant)}`
      )
    : [];

  let salesOrgProductIds = input.salesOrg
    ? await queryProductIds(
        client,
        'A_ProductSalesDelivery',
        `ProductSalesOrg eq ${odataStringLiteral(input.salesOrg)}`
      )
    : [];

  let descriptionFilter = input.description
    ? orFilters([
        substringFilter('Product', input.description),
        substringFilter('ProductGroup', input.description),
        productIdFilter(descriptionProductIds)
      ])
    : undefined;

  return andFilters([
    input.product ? `Product eq ${odataStringLiteral(input.product)}` : undefined,
    input.productType ? `ProductType eq ${odataStringLiteral(input.productType)}` : undefined,
    descriptionFilter,
    input.plant ? productIdFilter(plantProductIds) : undefined,
    input.salesOrg ? productIdFilter(salesOrgProductIds) : undefined
  ]);
};

let productExpand = 'to_Description,to_Plant,to_SalesDelivery';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description:
    'List SAP S/4HANA product/material master records for product lookup, sales order preparation, purchasing, and reporting.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      product: z.string().optional().describe('Exact SAP product/material id.'),
      description: z
        .string()
        .optional()
        .describe(
          'Search product id or product group. Description text may require expand support in the tenant.'
        ),
      productType: z.string().optional().describe('SAP product/material type.'),
      plant: z
        .string()
        .optional()
        .describe('Plant filter where supported by the SAP service.'),
      salesOrg: z
        .string()
        .optional()
        .describe('Sales organization filter where supported by the SAP service.'),
      expandDetails: z
        .boolean()
        .optional()
        .describe('Expand descriptions, plant metadata, and sales metadata.'),
      ...pageInputSchema
    })
  )
  .output(
    z.object({
      products: z.array(productSchema).describe('Products/materials.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    ensureFilteredQuery(
      ctx.input,
      {
        product: ctx.input.product,
        description: ctx.input.description,
        productType: ctx.input.productType,
        plant: ctx.input.plant,
        salesOrg: ctx.input.salesOrg
      },
      'product'
    );

    let client = createClient(ctx);
    let result = await client.queryEntitySet<Record<string, unknown>>({
      serviceName,
      entitySet: 'A_Product',
      pageToken: ctx.input.skipToken,
      query: {
        $top: topValue(ctx.input),
        $filter: (await buildProductFilters(ctx.input, client)) || undefined,
        $orderby: ctx.input.orderBy,
        $expand: ctx.input.expandDetails ? productExpand : undefined
      }
    });
    let products = result.items.map(mapProduct);

    return {
      output: {
        products,
        page: pageSummary(ctx.input, products.length, result.nextPageToken)
      },
      message: `Retrieved **${products.length}** SAP S/4HANA product(s).`
    };
  })
  .build();

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description:
    'Retrieve a SAP S/4HANA product/material by id, including descriptions, plant metadata, and sales metadata where authorized.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      product: z.string().min(1).describe('SAP product/material id.')
    })
  )
  .output(
    z.object({
      product: productSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let product = await client.getEntity<Record<string, unknown>>({
      serviceName,
      entitySet: 'A_Product',
      key: ctx.input.product,
      query: {
        $expand: productExpand
      }
    });
    let mapped = mapProduct(product);

    return {
      output: {
        product: mapped
      },
      message: `Retrieved SAP S/4HANA product **${mapped.product ?? ctx.input.product}**.`
    };
  })
  .build();
