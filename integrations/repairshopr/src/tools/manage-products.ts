import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let productSchema = z.object({
  productId: z.number().describe('Product ID'),
  name: z.string().optional().describe('Product name'),
  description: z.string().optional().describe('Product description'),
  cost: z.number().optional().describe('Cost price'),
  price: z.number().optional().describe('Retail price'),
  sku: z.string().optional().describe('SKU'),
  upc: z.string().optional().describe('UPC code'),
  quantity: z.number().optional().describe('Current inventory quantity'),
  categoryId: z.number().optional().describe('Category ID'),
  location: z.string().optional().describe('Storage location'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let mapProduct = (p: any) => ({
  productId: p.id,
  name: p.name,
  description: p.description,
  cost: p.cost ? Number(p.cost) : undefined,
  price: p.price_retail ? Number(p.price_retail) : undefined,
  sku: p.sku,
  upc: p.upc_code,
  quantity: p.quantity,
  categoryId: p.category_id,
  location: p.location,
  createdAt: p.created_at,
  updatedAt: p.updated_at
});

export let searchProducts = SlateTool.create(spec, {
  name: 'Search Products',
  key: 'search_products',
  description: `Search and list inventory products. Filter by category or use a search query to find products by name, SKU, or description.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query for product name, SKU, or description'),
      categoryId: z.number().optional().describe('Filter by product category ID'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      products: z.array(productSchema),
      totalPages: z.number().optional(),
      totalEntries: z.number().optional(),
      page: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listProducts(ctx.input);
    let products = (result.products || []).map(mapProduct);

    return {
      output: {
        products,
        totalPages: result.meta?.total_pages,
        totalEntries: result.meta?.total_entries,
        page: result.meta?.page
      },
      message: `Found **${products.length}** product(s).`
    };
  })
  .build();

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve detailed information about a specific product including pricing, inventory quantity, and category.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.number().describe('The product ID to retrieve')
    })
  )
  .output(productSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.getProduct(ctx.input.productId);
    let p = result.product || result;

    return {
      output: mapProduct(p),
      message: `Retrieved product **${p.name || p.id}** — Qty: ${p.quantity ?? 'N/A'}, Price: $${p.price_retail || 0}.`
    };
  })
  .build();

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Add a new product to inventory with name, pricing, SKU, and quantity.`
})
  .input(
    z.object({
      name: z.string().describe('Product name'),
      description: z.string().optional().describe('Product description'),
      cost: z.number().optional().describe('Cost price'),
      price: z.number().optional().describe('Retail price'),
      categoryId: z.number().optional().describe('Category ID'),
      sku: z.string().optional().describe('SKU'),
      quantity: z.number().optional().describe('Initial inventory quantity'),
      upc: z.string().optional().describe('UPC code'),
      location: z.string().optional().describe('Storage location')
    })
  )
  .output(productSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.createProduct({
      name: ctx.input.name,
      description: ctx.input.description,
      cost: ctx.input.cost,
      price: ctx.input.price,
      categoryId: ctx.input.categoryId,
      sku: ctx.input.sku,
      quantity: ctx.input.quantity,
      upc: ctx.input.upc,
      optionalLocation: ctx.input.location
    });
    let p = result.product || result;

    return {
      output: mapProduct(p),
      message: `Created product **${p.name}** (ID: ${p.id}).`
    };
  })
  .build();

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Update an existing product's name, description, pricing, quantity, or other fields.`
})
  .input(
    z.object({
      productId: z.number().describe('The product ID to update'),
      name: z.string().optional().describe('Updated product name'),
      description: z.string().optional().describe('Updated description'),
      cost: z.number().optional().describe('Updated cost price'),
      price: z.number().optional().describe('Updated retail price'),
      categoryId: z.number().optional().describe('Updated category ID'),
      sku: z.string().optional().describe('Updated SKU'),
      quantity: z.number().optional().describe('Updated inventory quantity'),
      upc: z.string().optional().describe('Updated UPC code'),
      location: z.string().optional().describe('Updated storage location')
    })
  )
  .output(productSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let { productId, ...updateData } = ctx.input;
    let result = await client.updateProduct(productId, updateData);
    let p = result.product || result;

    return {
      output: mapProduct(p),
      message: `Updated product **${p.name || p.id}**.`
    };
  })
  .build();
