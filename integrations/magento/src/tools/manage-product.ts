import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

let customAttributeSchema = z.object({
  attributeCode: z.string().describe('Attribute code'),
  value: z.any().describe('Attribute value')
});

let productOutputSchema = z.object({
  productId: z.number().optional().describe('Product entity ID'),
  sku: z.string().describe('Product SKU'),
  name: z.string().optional().describe('Product name'),
  price: z.number().optional().describe('Product price'),
  status: z.number().optional().describe('Product status (1=enabled, 2=disabled)'),
  visibility: z
    .number()
    .optional()
    .describe('Product visibility (1=not visible, 2=catalog, 3=search, 4=catalog+search)'),
  typeId: z
    .string()
    .optional()
    .describe('Product type (simple, configurable, bundle, grouped, virtual, downloadable)'),
  weight: z.number().optional().describe('Product weight'),
  attributeSetId: z.number().optional().describe('Attribute set ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  customAttributes: z
    .array(customAttributeSchema)
    .optional()
    .describe('Custom product attributes')
});

let mapProduct = (p: any) => ({
  productId: p.id,
  sku: p.sku,
  name: p.name,
  price: p.price,
  status: p.status,
  visibility: p.visibility,
  typeId: p.type_id,
  weight: p.weight,
  attributeSetId: p.attribute_set_id,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  customAttributes: p.custom_attributes?.map((a: any) => ({
    attributeCode: a.attribute_code,
    value: a.value
  }))
});

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `Create, update, retrieve, or delete products in the Magento catalog. Supports all product types including simple, configurable, bundle, grouped, and virtual. Set pricing, status, visibility, weight, custom attributes, and more.`,
  instructions: [
    'To **get** a product, provide the SKU.',
    'To **create** a product, set action to "create" and provide at least sku, name, typeId, attributeSetId, and price.',
    'To **update** a product, set action to "update" and provide the sku along with fields to change.',
    'To **delete** a product, set action to "delete" and provide the sku.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Operation to perform'),
      sku: z.string().describe('Product SKU (required for all actions)'),
      name: z.string().optional().describe('Product name'),
      typeId: z
        .string()
        .optional()
        .describe(
          'Product type: simple, configurable, bundle, grouped, virtual, downloadable'
        ),
      attributeSetId: z
        .number()
        .optional()
        .describe('Attribute set ID (default is usually 4)'),
      price: z.number().optional().describe('Product price'),
      status: z.number().optional().describe('Product status: 1 (enabled), 2 (disabled)'),
      visibility: z
        .number()
        .optional()
        .describe('Visibility: 1 (not visible), 2 (catalog), 3 (search), 4 (catalog+search)'),
      weight: z.number().optional().describe('Product weight'),
      customAttributes: z
        .array(customAttributeSchema)
        .optional()
        .describe('Custom attributes to set on the product')
    })
  )
  .output(
    z.object({
      product: productOutputSchema
        .optional()
        .describe('Product details (for get/create/update)'),
      deleted: z.boolean().optional().describe('Whether the product was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagentoClient({
      storeUrl: ctx.config.storeUrl,
      storeCode: ctx.config.storeCode,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'get') {
      let product = await client.getProduct(ctx.input.sku);
      return {
        output: { product: mapProduct(product) },
        message: `Retrieved product **${product.name || product.sku}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteProduct(ctx.input.sku);
      return {
        output: { deleted: true },
        message: `Deleted product with SKU \`${ctx.input.sku}\`.`
      };
    }

    let productData: Record<string, any> = { sku: ctx.input.sku };
    if (ctx.input.name !== undefined) productData.name = ctx.input.name;
    if (ctx.input.typeId !== undefined) productData.type_id = ctx.input.typeId;
    if (ctx.input.attributeSetId !== undefined)
      productData.attribute_set_id = ctx.input.attributeSetId;
    if (ctx.input.price !== undefined) productData.price = ctx.input.price;
    if (ctx.input.status !== undefined) productData.status = ctx.input.status;
    if (ctx.input.visibility !== undefined) productData.visibility = ctx.input.visibility;
    if (ctx.input.weight !== undefined) productData.weight = ctx.input.weight;
    if (ctx.input.customAttributes) {
      productData.custom_attributes = ctx.input.customAttributes.map(a => ({
        attribute_code: a.attributeCode,
        value: a.value
      }));
    }

    if (ctx.input.action === 'create') {
      let product = await client.createProduct(productData);
      return {
        output: { product: mapProduct(product) },
        message: `Created product **${product.name || product.sku}** (ID: ${product.id}).`
      };
    }

    // update
    let product = await client.updateProduct(ctx.input.sku, productData);
    return {
      output: { product: mapProduct(product) },
      message: `Updated product **${product.name || product.sku}**.`
    };
  })
  .build();
