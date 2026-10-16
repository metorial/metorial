import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, requireValue } from '../lib/response';
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
        .describe('Product external ID, required for all actions'),
      variantId: z
        .string()
        .optional()
        .describe('Variant external ID, required for every variant action'),
      storeId: z
        .string()
        .optional()
        .describe(
          'Store ID, required for all actions. Call manage_store with action list to discover stores.'
        ),
      name: z.string().optional().describe('Product or variant name'),
      description: z.string().optional().describe('Product description'),
      price: z.number().optional().describe('Price'),
      sku: z.string().optional().describe('SKU code'),
      inventoryQuantity: z.number().optional().describe('Inventory quantity'),
      category: z
        .string()
        .optional()
        .describe(
          'Product category name; provide categories with external IDs for the documented API.'
        ),
      categories: z
        .array(z.object({ categoryId: z.string(), name: z.string() }))
        .optional()
        .describe('Product categories with IDs from your commerce platform'),
      imageUrl: z.string().optional().describe('Product image URL')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
      productId: z.string().optional(),
      variantId: z.string().optional(),
      name: z.string().optional(),
      price: z.number().optional(),
      sku: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let storeId = requireValue(
      ctx.input.storeId,
      'storeId; call manage_store with action list'
    );
    let client = new GistClient({ token: ctx.auth.token });

    requireValue(ctx.input.productId, 'productId');
    if (ctx.input.action.includes('variant')) requireValue(ctx.input.variantId, 'variantId');
    if (ctx.input.action === 'create' || ctx.input.action === 'create_variant')
      requireValue(ctx.input.name, 'Product title');
    if (ctx.input.category && !ctx.input.categories)
      throw createApiServiceError(
        'Provide categories with categoryId and name; Gist does not document category names alone.'
      );
    let productId = requireValue(ctx.input.productId, 'productId');
    let buildBody = () => {
      let body: Record<string, any> = {};
      if (ctx.input.productId) body.product_id = ctx.input.productId;
      if (ctx.input.variantId) body.product_variant_id = ctx.input.variantId;
      if (ctx.input.name) body.title = ctx.input.name;
      if (ctx.input.description) body.description = ctx.input.description;
      if (ctx.input.price !== undefined) body.price = ctx.input.price;
      if (ctx.input.sku) body.sku = ctx.input.sku;
      if (ctx.input.inventoryQuantity !== undefined)
        body.inventory_quantity = ctx.input.inventoryQuantity;
      if (ctx.input.categories)
        body.categories = ctx.input.categories.map(category => {
          let id = requireValue(category.categoryId, 'Category ID');
          let numericId = Number(id);
          return /^\d+$/.test(id) && Number.isSafeInteger(numericId) ? numericId : id;
        });
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
        let data = await client.createProduct(storeId, buildBody());
        let product = data.product || data;
        return {
          output: {
            rawResponse: client.responses,
            productId: requiredId(product.id),
            name: product.name,
            price: product.price,
            sku: product.sku
          },
          message: `Created product **${product.name || product.id}**.`
        };
      }

      case 'update': {
        if (!ctx.input.productId) throw createApiServiceError('productId is required');
        let data = await client.updateProduct(storeId, ctx.input.productId, buildBody());
        let product = data.product || data;
        return {
          output: {
            rawResponse: client.responses,
            productId: requiredId(product.id),
            name: product.name,
            price: product.price,
            sku: product.sku
          },
          message: `Updated product **${ctx.input.productId}**.`
        };
      }

      case 'get': {
        if (!ctx.input.productId) throw createApiServiceError('productId is required');
        let data = await client.getProduct(storeId, ctx.input.productId);
        let product = data.product || data;
        return {
          output: {
            rawResponse: client.responses,
            productId: requiredId(product.id),
            name: product.name,
            price: product.price,
            sku: product.sku
          },
          message: `Retrieved product **${product.name || product.id}**.`
        };
      }

      case 'create_variant': {
        let data = await client.createProductVariant(storeId, productId, buildBody());
        let variant = data.product_variant || data;
        return {
          output: {
            rawResponse: client.responses,
            variantId: requiredId(variant.id),
            name: variant.name,
            price: variant.price,
            sku: variant.sku
          },
          message: `Created variant **${variant.name || variant.id}**.`
        };
      }

      case 'update_variant': {
        if (!ctx.input.variantId) throw createApiServiceError('variantId is required');
        let data = await client.updateProductVariant(
          storeId,
          productId,
          ctx.input.variantId,
          buildBody()
        );
        let variant = data.product_variant || data;
        return {
          output: {
            rawResponse: client.responses,
            variantId: requiredId(variant.id),
            name: variant.name,
            price: variant.price,
            sku: variant.sku
          },
          message: `Updated variant **${ctx.input.variantId}**.`
        };
      }

      case 'get_variant': {
        if (!ctx.input.variantId) throw createApiServiceError('variantId is required');
        let data = await client.getProductVariant(storeId, productId, ctx.input.variantId);
        let variant = data.product_variant || data;
        return {
          output: {
            rawResponse: client.responses,
            variantId: requiredId(variant.id),
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
