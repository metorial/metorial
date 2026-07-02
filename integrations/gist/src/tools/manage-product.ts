import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage E-Commerce Product',
  key: 'manage_product',
  description: `Create, update, or retrieve e-commerce products and product variants in Gist. Products support categories, pricing, inventory, and SKUs.`
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'create_variant', 'update_variant', 'get_variant'])
        .describe('Action to perform'),
      productId: z
        .string()
        .optional()
        .describe('Product ID (for update/get or as parent for variants)'),
      variantId: z.string().optional().describe('Variant ID (for variant actions)'),
      storeId: z.string().optional().describe('Store ID'),
      name: z.string().optional().describe('Product or variant name'),
      description: z.string().optional().describe('Product description'),
      price: z.number().optional().describe('Price'),
      sku: z.string().optional().describe('SKU code'),
      inventoryQuantity: z.number().optional().describe('Inventory quantity'),
      category: z.string().optional().describe('Product category'),
      imageUrl: z.string().optional().describe('Product image URL')
    })
  )
  .output(
    z.object({
      productId: z.string().optional(),
      variantId: z.string().optional(),
      name: z.string().optional(),
      price: z.number().optional(),
      sku: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    let buildBody = () => {
      let body: Record<string, any> = {};
      if (ctx.input.storeId) body.store_id = ctx.input.storeId;
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.description) body.description = ctx.input.description;
      if (ctx.input.price !== undefined) body.price = ctx.input.price;
      if (ctx.input.sku) body.sku = ctx.input.sku;
      if (ctx.input.inventoryQuantity !== undefined)
        body.inventory_quantity = ctx.input.inventoryQuantity;
      if (ctx.input.category) body.category = ctx.input.category;
      if (ctx.input.imageUrl) body.image_url = ctx.input.imageUrl;
      if (
        ctx.input.productId &&
        (ctx.input.action === 'create_variant' || ctx.input.action === 'update_variant')
      ) {
        body.product_id = ctx.input.productId;
      }
      return body;
    };

    switch (ctx.input.action) {
      case 'create': {
        let data = await client.createProduct(buildBody());
        let product = data.product || data;
        return {
          output: {
            productId: String(product.id),
            name: product.name,
            price: product.price,
            sku: product.sku
          },
          message: `Created product **${product.name || product.id}**.`
        };
      }

      case 'update': {
        if (!ctx.input.productId) throw new Error('productId is required');
        let data = await client.updateProduct(ctx.input.productId, buildBody());
        let product = data.product || data;
        return {
          output: {
            productId: String(product.id),
            name: product.name,
            price: product.price,
            sku: product.sku
          },
          message: `Updated product **${ctx.input.productId}**.`
        };
      }

      case 'get': {
        if (!ctx.input.productId) throw new Error('productId is required');
        let data = await client.getProduct(ctx.input.productId);
        let product = data.product || data;
        return {
          output: {
            productId: String(product.id),
            name: product.name,
            price: product.price,
            sku: product.sku
          },
          message: `Retrieved product **${product.name || product.id}**.`
        };
      }

      case 'create_variant': {
        let data = await client.createProductVariant(buildBody());
        let variant = data.product_variant || data;
        return {
          output: {
            variantId: String(variant.id),
            name: variant.name,
            price: variant.price,
            sku: variant.sku
          },
          message: `Created variant **${variant.name || variant.id}**.`
        };
      }

      case 'update_variant': {
        if (!ctx.input.variantId) throw new Error('variantId is required');
        let data = await client.updateProductVariant(ctx.input.variantId, buildBody());
        let variant = data.product_variant || data;
        return {
          output: {
            variantId: String(variant.id),
            name: variant.name,
            price: variant.price,
            sku: variant.sku
          },
          message: `Updated variant **${ctx.input.variantId}**.`
        };
      }

      case 'get_variant': {
        if (!ctx.input.variantId) throw new Error('variantId is required');
        let data = await client.getProductVariant(ctx.input.variantId);
        let variant = data.product_variant || data;
        return {
          output: {
            variantId: String(variant.id),
            name: variant.name,
            price: variant.price,
            sku: variant.sku
          },
          message: `Retrieved variant **${variant.name || variant.id}**.`
        };
      }
    }
  })
  .build();
