import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new customer record in Booqable. Supports setting name, email, discount percentage, deposit type, tax region, and custom properties.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the customer'),
      email: z.string().optional().describe('Email address'),
      discountPercentage: z
        .number()
        .optional()
        .describe('Default discount percentage for this customer'),
      depositType: z
        .enum(['none', 'percentage_total', 'percentage', 'fixed'])
        .optional()
        .describe('Type of deposit required'),
      depositValue: z
        .number()
        .optional()
        .describe('Deposit value (percentage or fixed amount depending on deposit type)'),
      taxRegionId: z
        .string()
        .optional()
        .describe('ID of the tax region to apply to this customer'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the customer'),
      properties: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Custom properties such as addresses or phone numbers')
    })
  )
  .output(
    z.object({
      customer: z.record(z.string(), z.any()).describe('The newly created customer record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let attributes: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.email) attributes.email = ctx.input.email;
    if (ctx.input.discountPercentage !== undefined)
      attributes.discount_percentage = ctx.input.discountPercentage;
    if (ctx.input.depositType) attributes.deposit_type = ctx.input.depositType;
    if (ctx.input.depositValue !== undefined)
      attributes.deposit_value = ctx.input.depositValue;
    if (ctx.input.taxRegionId) attributes.tax_region_id = ctx.input.taxRegionId;
    if (ctx.input.tags) attributes.tags = ctx.input.tags;
    if (ctx.input.properties) attributes.properties_attributes = ctx.input.properties;

    let response = await client.createCustomer(attributes);
    let customer = flattenSingleResource(response);

    return {
      output: { customer },
      message: `Created customer **${customer?.name}**.`
    };
  })
  .build();
