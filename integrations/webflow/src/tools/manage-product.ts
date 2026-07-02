import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `Create or update an ecommerce product. Provide product details and optional SKU/variant data. When updating, only the fields you provide will be changed.`,
  instructions: [
    'To **create** a new product, provide siteId, product data, and default SKU data (omit productId).',
    'To **update** an existing product, provide siteId, productId, and the fields to update.'
  ]
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site'),
      productId: z
        .string()
        .optional()
        .describe('Product ID when updating an existing product'),
      product: z
        .object({
          name: z.string().optional().describe('Product name'),
          slug: z.string().optional().describe('URL slug'),
          description: z.string().optional().describe('Product description (HTML allowed)'),
          shippable: z.boolean().optional().describe('Whether the product can be shipped'),
          categories: z.array(z.string()).optional().describe('Category IDs')
        })
        .optional()
        .describe('Product field data'),
      sku: z
        .object({
          name: z.string().optional().describe('SKU name'),
          slug: z.string().optional().describe('SKU slug'),
          price: z.number().optional().describe('Price in cents'),
          compareAtPrice: z.number().optional().describe('Compare-at price in cents'),
          width: z.number().optional().describe('Width for shipping'),
          height: z.number().optional().describe('Height for shipping'),
          length: z.number().optional().describe('Length for shipping'),
          weight: z.number().optional().describe('Weight for shipping')
        })
        .optional()
        .describe('Default SKU data'),
      publishStatus: z
        .enum(['staging', 'live'])
        .optional()
        .describe(
          'Whether created or updated product changes should remain staged or publish live'
        )
    })
  )
  .output(
    z.object({
      productId: z.string().describe('Unique identifier of the product'),
      name: z.string().optional().describe('Product name'),
      slug: z.string().optional().describe('Product slug')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let { siteId, productId, product, sku, publishStatus } = ctx.input;

    let productPayload: any | undefined;
    if (product) {
      productPayload = { fieldData: {} };
      if (product.name) productPayload.fieldData.name = product.name;
      if (product.slug) productPayload.fieldData.slug = product.slug;
      if (product.description) productPayload.fieldData.description = product.description;
      if (product.shippable !== undefined)
        productPayload.fieldData.shippable = product.shippable;
      if (product.categories) productPayload.fieldData.categories = product.categories;
    }

    let skuPayload: any;
    if (sku) {
      skuPayload = { fieldData: {} as any };
      if (sku.name) skuPayload.fieldData.name = sku.name;
      if (sku.slug) skuPayload.fieldData.slug = sku.slug;
      if (sku.price !== undefined)
        skuPayload.fieldData.price = { value: sku.price, unit: 'USD' };
      if (sku.compareAtPrice !== undefined)
        skuPayload.fieldData['compare-at-price'] = { value: sku.compareAtPrice, unit: 'USD' };
      if (sku.width !== undefined) skuPayload.fieldData.width = sku.width;
      if (sku.height !== undefined) skuPayload.fieldData.height = sku.height;
      if (sku.length !== undefined) skuPayload.fieldData.length = sku.length;
      if (sku.weight !== undefined) skuPayload.fieldData.weight = sku.weight;
    }

    let result: any;
    if (productId) {
      let updatePayload: any = {};
      if (productPayload) updatePayload.product = productPayload;
      if (skuPayload) updatePayload.sku = skuPayload;
      if (publishStatus) updatePayload.publishStatus = publishStatus;

      if (Object.keys(updatePayload).length === 0) {
        throw createApiServiceError('Provide product, sku, or publishStatus to update.');
      }

      result = await client.updateProduct(siteId, productId, updatePayload);
    } else {
      if (!product?.name) {
        throw createApiServiceError('Product name is required when creating a new product.');
      }
      if (!skuPayload) {
        throw createApiServiceError('sku is required when creating a new product.');
      }
      result = await client.createProduct(siteId, {
        product: productPayload,
        sku: skuPayload,
        publishStatus
      });
    }

    let p = result.product ?? result;
    return {
      output: {
        productId: p.id ?? p._id ?? productId ?? '',
        name: p.fieldData?.name ?? p.name,
        slug: p.fieldData?.slug ?? p.slug
      },
      message: productId
        ? `Updated product **${p.fieldData?.name ?? productId}**.`
        : `Created product **${p.fieldData?.name}**.`
    };
  })
  .build();
