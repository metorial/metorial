import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let productSchema = z.object({
  productId: z.string().optional().describe('Product ID'),
  code: z.string().optional().describe('Product code or SKU'),
  name: z.string().optional().describe('Product name'),
  unitCost: z.string().optional().describe('Unit cost/price as a string'),
  currency: z.string().optional().describe('Currency code'),
  taxClass: z.string().optional().describe('Tax class for the product'),
  kind: z.string().optional().describe('Product kind')
});

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Retrieve a list of products (items) from Quaderno. Products can be used as line items on invoices, credit notes, and expenses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter products'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      products: z.array(productSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listProducts({
      q: ctx.input.query,
      page: ctx.input.page
    });

    let products = (Array.isArray(result) ? result : []).map((p: any) => ({
      productId: p.id?.toString(),
      code: p.code,
      name: p.name,
      unitCost: p.unit_cost,
      currency: p.currency,
      taxClass: p.tax_class,
      kind: p.kind
    }));

    return {
      output: { products },
      message: `Found **${products.length}** product(s)`
    };
  })
  .build();

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product in Quaderno. Products can be reused as line items on invoices, credit notes, and expenses.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      code: z.string().optional().describe('Product code or SKU'),
      name: z.string().describe('Product name'),
      unitCost: z.string().optional().describe('Unit cost/price'),
      currency: z.string().optional().describe('Currency code (e.g., "USD", "EUR")'),
      taxClass: z.string().optional().describe('Tax class for the product')
    })
  )
  .output(productSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.code) data.code = ctx.input.code;
    if (ctx.input.unitCost) data.unit_cost = ctx.input.unitCost;
    if (ctx.input.currency) data.currency = ctx.input.currency;
    if (ctx.input.taxClass) data.tax_class = ctx.input.taxClass;

    let p = await client.createProduct(data);

    return {
      output: {
        productId: p.id?.toString(),
        code: p.code,
        name: p.name,
        unitCost: p.unit_cost,
        currency: p.currency,
        taxClass: p.tax_class,
        kind: p.kind
      },
      message: `Created product **${p.name}**`
    };
  })
  .build();

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Update an existing product in Quaderno. Only the provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product to update'),
      code: z.string().optional().describe('Product code or SKU'),
      name: z.string().optional().describe('Product name'),
      unitCost: z.string().optional().describe('Unit cost/price'),
      currency: z.string().optional().describe('Currency code'),
      taxClass: z.string().optional().describe('Tax class for the product')
    })
  )
  .output(productSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {};
    if (ctx.input.code !== undefined) data.code = ctx.input.code;
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.unitCost !== undefined) data.unit_cost = ctx.input.unitCost;
    if (ctx.input.currency !== undefined) data.currency = ctx.input.currency;
    if (ctx.input.taxClass !== undefined) data.tax_class = ctx.input.taxClass;

    let p = await client.updateProduct(ctx.input.productId, data);

    return {
      output: {
        productId: p.id?.toString(),
        code: p.code,
        name: p.name,
        unitCost: p.unit_cost,
        currency: p.currency,
        taxClass: p.tax_class,
        kind: p.kind
      },
      message: `Updated product **${p.name || ctx.input.productId}**`
    };
  })
  .build();

export let deleteProduct = SlateTool.create(spec, {
  name: 'Delete Product',
  key: 'delete_product',
  description: `Delete a product from Quaderno.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the product was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteProduct(ctx.input.productId);

    return {
      output: { success: true },
      message: `Deleted product **${ctx.input.productId}**`
    };
  })
  .build();
