import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProductModule = SlateTool.create(spec, {
  name: 'Manage Product Module',
  key: 'manage_product_module',
  description: `Create, update, or delete a product module. Modules belong to a product and define which licensing model to use (e.g., Subscription, Try & Buy, Floating, Pay-per-Use).`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      productModuleNumber: z
        .string()
        .optional()
        .describe('Module identifier. Required for update/delete. Optional for create.'),
      productNumber: z
        .string()
        .optional()
        .describe('Parent product number. Required for create.'),
      name: z.string().optional().describe('Module name'),
      active: z.boolean().optional().describe('Whether the module is active'),
      licensingModel: z
        .string()
        .optional()
        .describe(
          'Licensing model name (e.g., TryAndBuy, Subscription, Floating, PayPerUse, MultiFeature, Quota, NodeLocked, PricingTable, Rental)'
        ),
      maxCheckoutValidity: z
        .number()
        .optional()
        .describe('Maximum checkout validity in days for offline validation'),
      yellowThreshold: z
        .number()
        .optional()
        .describe('Remaining time volume for the yellow warning level (Rental model)'),
      redThreshold: z
        .number()
        .optional()
        .describe('Remaining time volume for the red warning level (Rental model)'),
      forceCascade: z.boolean().optional().describe('When deleting, force cascade deletion')
    })
  )
  .output(
    z.object({
      productModuleNumber: z.string().describe('Module number'),
      productNumber: z.string().optional().describe('Parent product number'),
      name: z.string().optional().describe('Module name'),
      active: z.boolean().optional().describe('Whether active'),
      licensingModel: z.string().optional().describe('Licensing model'),
      deleted: z.boolean().optional().describe('True if deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, productModuleNumber, forceCascade, ...params } = ctx.input;

    if (action === 'delete') {
      if (!productModuleNumber)
        throw createApiServiceError('productModuleNumber is required for delete', {
          reason: 'invalid_input'
        });
      await client.deleteProductModule(productModuleNumber, forceCascade);
      return {
        output: { productModuleNumber, deleted: true },
        message: `Product module **${productModuleNumber}** has been deleted.`
      };
    }

    if (action === 'update') {
      if (!productModuleNumber)
        throw createApiServiceError('productModuleNumber is required for update', {
          reason: 'invalid_input'
        });
      let result = await client.updateProductModule(productModuleNumber, params);
      if (!result)
        throw createApiServiceError('Failed to update product module', {
          reason: 'invalid_response'
        });
      return {
        output: {
          productModuleNumber: result.number,
          productNumber: result.productNumber,
          name: result.name,
          active: result.active,
          licensingModel: result.licensingModel
        },
        message: `Product module **${result.number}** (${result.name}) has been updated.`
      };
    }

    // create
    let createParams: Record<string, any> = { ...params };
    if (productModuleNumber) createParams.number = productModuleNumber;
    let result = await client.createProductModule(createParams);
    if (!result)
      throw createApiServiceError('Failed to create product module', {
        reason: 'invalid_response'
      });
    return {
      output: {
        productModuleNumber: result.number,
        productNumber: result.productNumber,
        name: result.name,
        active: result.active,
        licensingModel: result.licensingModel
      },
      message: `Product module **${result.number}** (${result.name}) has been created.`
    };
  })
  .build();
