import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let productImageSchema = z.object({
  url: z.string().describe('Image URL'),
  width: z.number().describe('Image width in pixels'),
  height: z.number().describe('Image height in pixels')
});

let productOutputSchema = z.object({
  sku: z.string().describe('Product SKU'),
  name: z.string().describe('Product name'),
  price: z.number().describe('Product price'),
  quantity: z.number().describe('Available quantity'),
  minimum: z.number().describe('Minimum selection quantity'),
  maximum: z.number().describe('Maximum selection quantity'),
  discountable: z.boolean().describe('Whether discounts apply'),
  images: z.array(productImageSchema).describe('Product images')
});

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `List all products on a Paperform payment/order form. Returns product details including name, price, quantity, and images.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID'),
      search: z.string().optional().describe('Filter products by name'),
      limit: z
        .number()
        .optional()
        .describe('Number of results to return (max 100, default 20)'),
      skip: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      products: z.array(productOutputSchema),
      total: z.number().describe('Total number of products'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProducts(ctx.input.formSlugOrId, {
      search: ctx.input.search,
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let products = result.results.map(p => ({
      sku: p.SKU,
      name: p.name,
      price: p.price,
      quantity: p.quantity,
      minimum: p.minimum,
      maximum: p.maximum,
      discountable: p.discountable,
      images: p.images
    }));

    return {
      output: { products, total: result.total, hasMore: result.has_more },
      message: `Found **${result.total}** product(s). Returned **${products.length}** result(s).`
    };
  })
  .build();

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product on a Paperform form. Products are used in payment/order forms and identified by a unique SKU. Maximum 100 products per form.`,
  constraints: [
    'Maximum 100 products per form.',
    'Product SKUs must be unique across the form.'
  ]
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID'),
      sku: z.string().describe('Unique product identifier (SKU)'),
      name: z.string().describe('Product name'),
      price: z.number().describe('Product price'),
      quantity: z.number().optional().describe('Available quantity'),
      minimum: z.number().optional().describe('Minimum purchase quantity'),
      maximum: z.number().optional().describe('Maximum purchase quantity'),
      discountable: z.boolean().optional().describe('Whether discounts can be applied'),
      images: z.array(productImageSchema).optional().describe('Product images')
    })
  )
  .output(productOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let p = await client.createProduct(ctx.input.formSlugOrId, {
      SKU: ctx.input.sku,
      name: ctx.input.name,
      price: ctx.input.price,
      quantity: ctx.input.quantity,
      minimum: ctx.input.minimum,
      maximum: ctx.input.maximum,
      discountable: ctx.input.discountable,
      images: ctx.input.images
    });

    return {
      output: {
        sku: p.SKU,
        name: p.name,
        price: p.price,
        quantity: p.quantity,
        minimum: p.minimum,
        maximum: p.maximum,
        discountable: p.discountable,
        images: p.images
      },
      message: `Created product **${p.name}** (SKU: ${p.SKU}) at price ${p.price}.`
    };
  })
  .build();

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Update an existing product on a Paperform form. Can modify name, price, quantity, sold count, selection limits, discountability, and images. Provide only the fields you want to change.`,
  instructions: [
    'To update only the available quantity or sold count, you can provide just those fields without other product details.'
  ]
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID'),
      sku: z.string().describe('Product SKU to update'),
      name: z.string().optional().describe('New product name'),
      price: z.number().optional().describe('New product price'),
      quantity: z.number().optional().describe('New available quantity'),
      sold: z.number().optional().describe('New sold count'),
      minimum: z.number().optional().describe('New minimum purchase quantity'),
      maximum: z.number().optional().describe('New maximum purchase quantity'),
      discountable: z.boolean().optional().describe('Whether discounts can be applied'),
      images: z.array(productImageSchema).optional().describe('New product images')
    })
  )
  .output(productOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    // Update main product fields if any are provided
    let hasMainUpdate =
      ctx.input.name !== undefined ||
      ctx.input.price !== undefined ||
      ctx.input.minimum !== undefined ||
      ctx.input.maximum !== undefined ||
      ctx.input.discountable !== undefined ||
      ctx.input.images !== undefined;

    let p: any;
    if (hasMainUpdate) {
      p = await client.updateProduct(ctx.input.formSlugOrId, ctx.input.sku, {
        name: ctx.input.name,
        price: ctx.input.price,
        minimum: ctx.input.minimum,
        maximum: ctx.input.maximum,
        discountable: ctx.input.discountable,
        images: ctx.input.images
      });
    }

    if (ctx.input.quantity !== undefined) {
      p = await client.updateProductQuantity(
        ctx.input.formSlugOrId,
        ctx.input.sku,
        ctx.input.quantity
      );
    }

    if (ctx.input.sold !== undefined) {
      p = await client.updateProductSold(
        ctx.input.formSlugOrId,
        ctx.input.sku,
        ctx.input.sold
      );
    }

    if (!p) {
      p = await client.getProduct(ctx.input.formSlugOrId, ctx.input.sku);
    }

    return {
      output: {
        sku: p.SKU,
        name: p.name,
        price: p.price,
        quantity: p.quantity,
        minimum: p.minimum,
        maximum: p.maximum,
        discountable: p.discountable,
        images: p.images
      },
      message: `Updated product **${p.name}** (SKU: ${p.SKU}).`
    };
  })
  .build();

export let deleteProduct = SlateTool.create(spec, {
  name: 'Delete Product',
  key: 'delete_product',
  description: `Delete a product from a Paperform form by its SKU. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID'),
      sku: z.string().describe('Product SKU to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteProduct(ctx.input.formSlugOrId, ctx.input.sku);

    return {
      output: { deleted: true },
      message: `Deleted product with SKU **${ctx.input.sku}**.`
    };
  })
  .build();
