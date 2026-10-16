import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateNumber } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer's details, including name, email, discount, deposit settings, tax region, and tags. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('The unique ID of the customer to update'),
      name: z.string().optional().describe('Updated full name'),
      email: z.string().optional().describe('Updated email address'),
      discountPercentage: z
        .number()
        .optional()
        .describe('Updated default discount percentage'),
      depositType: z
        .enum(['none', 'percentage_total', 'percentage', 'fixed'])
        .optional()
        .describe('Updated deposit type'),
      depositValue: z.number().optional().describe('Updated deposit value'),
      taxRegionId: z.string().optional().describe('Updated tax region ID'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      properties: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Updated custom properties')
    })
  )
  .output(
    z.object({
      customer: z.record(z.string(), z.any()).describe('The updated customer record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    validateNumber(ctx.input.discountPercentage, 'Discount percentage', { min: 0, max: 100 });
    validateNumber(ctx.input.depositValue, 'Deposit value', {
      min: 0,
      ...(ctx.input.depositType?.startsWith('percentage') ? { max: 100 } : {})
    });

    let attributes: Record<string, any> = {};
    if (ctx.input.name !== undefined) attributes.name = ctx.input.name;
    if (ctx.input.email !== undefined) attributes.email = ctx.input.email;
    if (ctx.input.discountPercentage !== undefined)
      attributes.discount_percentage = ctx.input.discountPercentage;
    if (ctx.input.depositType) attributes.deposit_type = ctx.input.depositType;
    if (ctx.input.depositValue !== undefined)
      attributes.deposit_value = ctx.input.depositValue;
    if (ctx.input.taxRegionId !== undefined) attributes.tax_region_id = ctx.input.taxRegionId;
    if (ctx.input.tags) attributes.tag_list = ctx.input.tags;
    if (ctx.input.properties) attributes.properties_attributes = ctx.input.properties;

    let response = await client.updateCustomer(ctx.input.customerId, attributes);
    let customer = flattenSingleResource(response);

    return {
      output: { customer },
      message: `Updated customer **${customer?.name || ctx.input.customerId}**.`
    };
  })
  .build();
