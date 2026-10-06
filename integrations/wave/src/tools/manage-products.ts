import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import type { Product } from '../lib/contracts';
import { decimalNumber } from '../lib/validation';
import { spec } from '../spec';

let productOutputSchema = z.object({
  productId: z.string().describe('Unique identifier of the product'),
  name: z.string().describe('Product or service name'),
  description: z.string().optional().describe('Product description'),
  unitPrice: z.number().optional().describe('Per-unit price'),
  isSold: z.boolean().optional().describe('Whether the product is sold to customers'),
  isBought: z.boolean().optional().describe('Whether the product is purchased from vendors'),
  isArchived: z.boolean().optional().describe('Whether the product is archived'),
  incomeAccount: z
    .object({
      accountId: z.string().optional(),
      name: z.string().optional()
    })
    .optional()
    .describe('Income account associated with the product'),
  expenseAccount: z
    .object({
      accountId: z.string().optional(),
      name: z.string().optional()
    })
    .optional()
    .describe('Expense account associated with the product'),
  defaultSalesTaxes: z
    .array(
      z.object({
        salesTaxId: z.string().optional(),
        name: z.string().optional()
      })
    )
    .optional()
    .describe('Default sales taxes for the product'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

let mapProduct = (p: Product) => ({
  productId: p.id,
  name: p.name,
  description: p.description,
  unitPrice: decimalNumber(p.unitPrice),
  isSold: p.isSold,
  isBought: p.isBought,
  isArchived: p.isArchived,
  incomeAccount: p.incomeAccount
    ? { accountId: p.incomeAccount.id, name: p.incomeAccount.name }
    : undefined,
  expenseAccount: p.expenseAccount
    ? { accountId: p.expenseAccount.id, name: p.expenseAccount.name }
    : undefined,
  defaultSalesTaxes: p.defaultSalesTaxes?.map(t => ({
    salesTaxId: t.id,
    name: t.name
  })),
  createdAt: p.createdAt,
  modifiedAt: p.modifiedAt
});

// --- List Products ---

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `List products and services in a Wave business's catalog. Returns product details including pricing, associated accounts, and default sales taxes.`,
  tags: {
    readOnly: true
  }
})
  .scopes(anyOf('product:read'))
  .input(
    z.object({
      businessId: z
        .string()
        .describe(
          'ID of the business to list products for. Call list_businesses to discover a permitted business ID.'
        ),
      page: z.number().optional().describe('Page number (starts at 1, default: 1)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)')
    })
  )
  .output(
    z.object({
      products: z.array(productOutputSchema).describe('List of products'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of products')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.listProducts(
      ctx.input.businessId,
      ctx.input.page ?? 1,
      ctx.input.pageSize ?? 20
    );

    return {
      output: {
        products: result.items.map(mapProduct),
        currentPage: result.pageInfo.currentPage,
        totalPages: result.pageInfo.totalPages,
        totalCount: result.pageInfo.totalCount
      },
      message: `Found **${result.pageInfo.totalCount}** products (page ${result.pageInfo.currentPage} of ${result.pageInfo.totalPages}).`
    };
  })
  .build();

// --- Create Product ---

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  tags: { readOnly: false },
  description: `Create a new product or service in a Wave business's catalog. Products can be associated with income and expense accounts and configured with default sales taxes for easy invoicing.`
})
  .scopes(anyOf('product:write'))
  .input(
    z.object({
      businessId: z
        .string()
        .describe(
          'ID of the business to create the product for. Call list_businesses to discover a permitted business ID.'
        ),
      name: z.string().describe('Product or service name'),
      unitPrice: z.number().describe('Per-unit price'),
      description: z.string().optional().describe('Product description'),
      incomeAccountId: z.string().optional().describe('ID of the income account to associate'),
      expenseAccountId: z
        .string()
        .optional()
        .describe('ID of the expense account to associate'),
      defaultSalesTaxIds: z
        .array(z.string())
        .optional()
        .describe('IDs of default sales taxes to apply'),
      isSold: z
        .boolean()
        .optional()
        .describe('Legacy field unsupported by product writes; set incomeAccountId instead.'),
      isBought: z
        .boolean()
        .optional()
        .describe('Legacy field unsupported by product writes; set expenseAccountId instead.')
    })
  )
  .output(productOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.createProduct(ctx.input);

    return {
      output: mapProduct(result.data),
      message: `Created product **${result.data.name}** at ${result.data.unitPrice} per unit in the business currency.`
    };
  })
  .build();

// --- Update Product ---

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  tags: { readOnly: false },
  description: `Update an existing product's details. Only the fields you provide will be updated; omitted fields remain unchanged.`
})
  .scopes(anyOf('product:write'))
  .input(
    z.object({
      productId: z.string().describe('ID of the product to update'),
      name: z.string().optional().describe('Updated product name'),
      unitPrice: z.number().optional().describe('Updated per-unit price'),
      description: z.string().optional().describe('Updated description'),
      incomeAccountId: z.string().optional().describe('Updated income account ID'),
      expenseAccountId: z.string().optional().describe('Updated expense account ID'),
      defaultSalesTaxIds: z
        .array(z.string())
        .optional()
        .describe('Updated default sales tax IDs'),
      isSold: z
        .boolean()
        .optional()
        .describe('Legacy field unsupported by product writes; set incomeAccountId instead.'),
      isBought: z
        .boolean()
        .optional()
        .describe('Legacy field unsupported by product writes; set expenseAccountId instead.')
    })
  )
  .output(productOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let { productId, ...rest } = ctx.input;
    let result = await client.patchProduct({ id: productId, ...rest });

    return {
      output: mapProduct(result.data),
      message: `Updated product **${result.data.name}**.`
    };
  })
  .build();

// --- Archive Product ---

export let archiveProduct = SlateTool.create(spec, {
  name: 'Archive Product',
  key: 'archive_product',
  tags: { readOnly: false, destructive: true },
  description: `Archive a product in the catalog. Archived products are hidden from active listings but are not deleted. Products cannot be permanently deleted in Wave.`
})
  .scopes(anyOf('product:write'))
  .input(
    z.object({
      productId: z.string().describe('ID of the product to archive')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the archival was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    await client.archiveProduct(ctx.input.productId);

    return {
      output: { success: true },
      message: `Archived product \`${ctx.input.productId}\`.`
    };
  })
  .build();
