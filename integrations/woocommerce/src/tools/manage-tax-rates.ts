import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let taxRateSchema = z.object({
  taxRateId: z.number(),
  country: z.string(),
  state: z.string(),
  postcode: z.string(),
  city: z.string(),
  rate: z.string(),
  name: z.string(),
  priority: z.number(),
  compound: z.boolean(),
  shipping: z.boolean(),
  order: z.number(),
  taxClass: z.string()
});

export let manageTaxRates = SlateTool.create(spec, {
  name: 'Manage Tax Rates',
  key: 'manage_tax_rates',
  description: `List, create, update, or delete tax rates. Configure rates by country, state, postcode, and city with options for compound taxes and shipping applicability.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'list_classes'])
        .describe('Operation to perform'),
      taxRateId: z
        .number()
        .optional()
        .describe('Tax rate ID (required for get/update/delete)'),
      page: z.number().optional().default(1).describe('Page number for list'),
      perPage: z.number().optional().default(10).describe('Results per page for list'),
      country: z.string().optional().describe('Country code (e.g., US)'),
      state: z.string().optional().describe('State code (e.g., CA)'),
      postcode: z.string().optional().describe('Postcode/ZIP'),
      city: z.string().optional().describe('City name'),
      rate: z.string().optional().describe('Tax rate percentage (e.g., "10.0000")'),
      name: z.string().optional().describe('Tax rate name'),
      priority: z.number().optional().describe('Tax rate priority'),
      compound: z.boolean().optional().describe('Whether tax is compounded'),
      shipping: z.boolean().optional().describe('Whether tax applies to shipping'),
      taxClass: z
        .string()
        .optional()
        .describe('Tax class (standard, reduced-rate, zero-rate)'),
      force: z.boolean().optional().default(true).describe('Force permanent deletion')
    })
  )
  .output(
    z.object({
      taxRates: z.array(taxRateSchema).optional(),
      taxRate: taxRateSchema.optional(),
      taxClasses: z
        .array(
          z.object({
            slug: z.string(),
            name: z.string()
          })
        )
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {
        page: ctx.input.page,
        per_page: ctx.input.perPage
      };
      let rates = await client.listTaxRates(params);
      let mapped = rates.map((r: any) => mapTaxRate(r));
      return {
        output: { taxRates: mapped },
        message: `Found **${mapped.length}** tax rates.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.taxRateId) throw new Error('taxRateId is required');
      let rate = await client.getTaxRate(ctx.input.taxRateId);
      return {
        output: { taxRate: mapTaxRate(rate) },
        message: `Retrieved tax rate **"${rate.name}"** (ID: ${rate.id}).`
      };
    }

    if (action === 'create') {
      let data: Record<string, any> = {};
      if (ctx.input.country) data.country = ctx.input.country;
      if (ctx.input.state) data.state = ctx.input.state;
      if (ctx.input.postcode) data.postcode = ctx.input.postcode;
      if (ctx.input.city) data.city = ctx.input.city;
      if (ctx.input.rate) data.rate = ctx.input.rate;
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.priority !== undefined) data.priority = ctx.input.priority;
      if (ctx.input.compound !== undefined) data.compound = ctx.input.compound;
      if (ctx.input.shipping !== undefined) data.shipping = ctx.input.shipping;
      if (ctx.input.taxClass) data.class = ctx.input.taxClass;

      let rate = await client.createTaxRate(data);
      return {
        output: { taxRate: mapTaxRate(rate) },
        message: `Created tax rate **"${rate.name}"** at ${rate.rate}% (ID: ${rate.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.taxRateId) throw new Error('taxRateId is required');

      let data: Record<string, any> = {};
      if (ctx.input.country) data.country = ctx.input.country;
      if (ctx.input.state) data.state = ctx.input.state;
      if (ctx.input.postcode) data.postcode = ctx.input.postcode;
      if (ctx.input.city) data.city = ctx.input.city;
      if (ctx.input.rate) data.rate = ctx.input.rate;
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.priority !== undefined) data.priority = ctx.input.priority;
      if (ctx.input.compound !== undefined) data.compound = ctx.input.compound;
      if (ctx.input.shipping !== undefined) data.shipping = ctx.input.shipping;
      if (ctx.input.taxClass) data.class = ctx.input.taxClass;

      let rate = await client.updateTaxRate(ctx.input.taxRateId, data);
      return {
        output: { taxRate: mapTaxRate(rate) },
        message: `Updated tax rate **"${rate.name}"** (ID: ${rate.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.taxRateId) throw new Error('taxRateId is required');
      await client.deleteTaxRate(ctx.input.taxRateId, ctx.input.force);
      return {
        output: { deleted: true },
        message: `Deleted tax rate (ID: ${ctx.input.taxRateId}).`
      };
    }

    if (action === 'list_classes') {
      let classes = await client.listTaxClasses();
      let mapped = (Array.isArray(classes) ? classes : []).map((c: any) => ({
        slug: c.slug || '',
        name: c.name || ''
      }));
      return {
        output: { taxClasses: mapped },
        message: `Found **${mapped.length}** tax classes.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapTaxRate = (r: any) => ({
  taxRateId: r.id,
  country: r.country || '',
  state: r.state || '',
  postcode: r.postcode || '',
  city: r.city || '',
  rate: r.rate || '0',
  name: r.name || '',
  priority: r.priority || 0,
  compound: r.compound || false,
  shipping: r.shipping || false,
  order: r.order || 0,
  taxClass: r.class || 'standard'
});
