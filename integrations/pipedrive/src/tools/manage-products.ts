import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { pipedriveServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageProducts = SlateTool.create(spec, {
  name: 'Manage Products',
  key: 'manage_products',
  description: `Create, update, or delete products in the Pipedrive product catalog. Products can be attached to deals with pricing and quantities.
Supports setting name, code, unit, tax, prices, and custom fields.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      productId: z.number().optional().describe('Product ID (required for update and delete)'),
      name: z.string().optional().describe('Product name (required for create)'),
      code: z.string().optional().describe('Product code/SKU'),
      unit: z.string().optional().describe('Unit of measurement'),
      tax: z.number().optional().describe('Tax percentage'),
      activeFlag: z.boolean().optional().describe('Whether the product is active'),
      visibleTo: z.enum(['1', '3', '5', '7']).optional().describe('Visibility setting'),
      prices: z
        .array(
          z.object({
            price: z.number().describe('Price value'),
            currency: z.string().describe('Currency code'),
            cost: z.number().optional().describe('Cost/wholesale price'),
            overheadCost: z.number().optional().describe('Overhead cost')
          })
        )
        .optional()
        .describe('Product pricing for different currencies'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values keyed by field API key')
    })
  )
  .output(
    z.object({
      productId: z.number().describe('Product ID'),
      name: z.string().optional().describe('Product name'),
      code: z.string().optional().nullable().describe('Product code'),
      unit: z.string().optional().nullable().describe('Unit of measurement'),
      tax: z.number().optional().describe('Tax percentage'),
      activeFlag: z.boolean().optional().describe('Whether active'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the product was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'delete') {
      if (!ctx.input.productId)
        throw pipedriveServiceError('productId is required for delete action');
      await client.deleteProduct(ctx.input.productId);
      return {
        output: { productId: ctx.input.productId, deleted: true },
        message: `Product **#${ctx.input.productId}** has been deleted.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.code) body.code = ctx.input.code;
    if (ctx.input.unit) body.unit = ctx.input.unit;
    if (ctx.input.tax !== undefined) body.tax = ctx.input.tax;
    if (ctx.input.activeFlag !== undefined) body.active_flag = ctx.input.activeFlag;
    if (ctx.input.visibleTo) body.visible_to = ctx.input.visibleTo;
    if (ctx.input.prices) {
      body.prices = ctx.input.prices.map(p => ({
        price: p.price,
        currency: p.currency,
        cost: p.cost,
        overhead_cost: p.overheadCost
      }));
    }
    if (ctx.input.customFields) {
      Object.assign(body, ctx.input.customFields);
    }

    let result: any;
    if (ctx.input.action === 'create') {
      result = await client.createProduct(body);
    } else {
      if (!ctx.input.productId)
        throw pipedriveServiceError('productId is required for update action');
      result = await client.updateProduct(ctx.input.productId, body);
    }

    let product = result?.data;
    let action = ctx.input.action === 'create' ? 'created' : 'updated';

    return {
      output: {
        productId: product?.id,
        name: product?.name,
        code: product?.code,
        unit: product?.unit,
        tax: product?.tax,
        activeFlag: product?.active_flag,
        addTime: product?.add_time,
        updateTime: product?.update_time
      },
      message: `Product **"${product?.name}"** (ID: ${product?.id}) has been ${action}.`
    };
  });
