import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `Create, update, or delete a product in NetLicensing. Products are the top-level entity representing your software applications. Each product contains modules with licensing models and templates.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      productNumber: z
        .string()
        .optional()
        .describe(
          'Unique product identifier. Required for update and delete. Optional for create (auto-generated if omitted).'
        ),
      name: z.string().optional().describe('Product name'),
      active: z.boolean().optional().describe('Whether the product is active'),
      version: z.string().optional().describe('Product version string'),
      description: z.string().optional().describe('Product description'),
      licensingInfo: z.string().optional().describe('Licensing information URL or text'),
      licenseeAutoCreate: z
        .boolean()
        .optional()
        .describe('If true, licensees are auto-created on validation if not found'),
      forceCascade: z
        .boolean()
        .optional()
        .describe('When deleting, force cascade deletion of all child entities')
    })
  )
  .output(
    z.object({
      productNumber: z.string().describe('Product number'),
      name: z.string().optional().describe('Product name'),
      active: z.boolean().optional().describe('Whether the product is active'),
      version: z.string().optional().describe('Product version'),
      description: z.string().optional().describe('Product description'),
      licenseeAutoCreate: z
        .boolean()
        .optional()
        .describe('Whether licensees are auto-created'),
      deleted: z.boolean().optional().describe('True if the product was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, productNumber, forceCascade, ...params } = ctx.input;

    if (action === 'delete') {
      if (!productNumber) throw new Error('productNumber is required for delete');
      await client.deleteProduct(productNumber, forceCascade);
      return {
        output: { productNumber, deleted: true },
        message: `Product **${productNumber}** has been deleted.`
      };
    }

    if (action === 'update') {
      if (!productNumber) throw new Error('productNumber is required for update');
      let result = await client.updateProduct(productNumber, params);
      if (!result) throw new Error('Failed to update product');
      return {
        output: {
          productNumber: result.number,
          name: result.name,
          active: result.active,
          version: result.version,
          description: result.description,
          licenseeAutoCreate: result.licenseeAutoCreate
        },
        message: `Product **${result.number}** (${result.name}) has been updated.`
      };
    }

    // create
    let createParams: Record<string, any> = { ...params };
    if (productNumber) createParams.number = productNumber;
    let result = await client.createProduct(createParams);
    if (!result) throw new Error('Failed to create product');
    return {
      output: {
        productNumber: result.number,
        name: result.name,
        active: result.active,
        version: result.version,
        description: result.description,
        licenseeAutoCreate: result.licenseeAutoCreate
      },
      message: `Product **${result.number}** (${result.name}) has been created.`
    };
  })
  .build();
