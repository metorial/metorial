import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

let mapTaxRate = (taxRate: any) => ({
  taxRateId: taxRate.id,
  displayName: taxRate.display_name,
  percentage: taxRate.percentage,
  inclusive: taxRate.inclusive,
  active: taxRate.active,
  country: taxRate.country ?? null,
  state: taxRate.state ?? null,
  jurisdiction: taxRate.jurisdiction ?? null,
  taxType: taxRate.tax_type ?? null,
  description: taxRate.description ?? null,
  created: taxRate.created
});

export let manageTaxRates = SlateTool.create(spec, {
  name: 'Manage Tax Rates',
  key: 'manage_tax_rates',
  description:
    'Create, retrieve, update, or list Stripe manual Tax Rates for invoices, subscriptions, and Checkout Sessions.',
  instructions: [
    'Tax rates cannot be deleted in Stripe; set active=false to archive them for new usage.',
    'For create, displayName, percentage, and inclusive are required.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'list']).describe('Operation to perform'),
      taxRateId: z.string().optional().describe('Tax Rate ID (required for get/update)'),
      displayName: z.string().optional().describe('Customer-visible tax rate name'),
      percentage: z.number().optional().describe('Tax percentage out of 100'),
      inclusive: z.boolean().optional().describe('Whether the tax is inclusive'),
      active: z.boolean().optional().describe('Whether the tax rate is active'),
      country: z.string().optional().describe('Two-letter country code'),
      state: z.string().optional().describe('Subdivision code without country prefix'),
      jurisdiction: z.string().optional().describe('Jurisdiction label shown on invoices'),
      taxType: z.string().optional().describe('High-level tax type, such as vat or sales_tax'),
      description: z.string().optional().describe('Internal description'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata'),
      limit: z.number().optional().describe('Max results (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      taxRateId: z.string().optional().describe('Tax Rate ID'),
      displayName: z.string().optional().describe('Tax rate display name'),
      percentage: z.number().optional().describe('Tax percentage'),
      inclusive: z.boolean().optional().describe('Whether the rate is inclusive'),
      active: z.boolean().optional().describe('Whether the rate is active'),
      country: z.string().optional().nullable().describe('Country code'),
      state: z.string().optional().nullable().describe('Subdivision code'),
      jurisdiction: z.string().optional().nullable().describe('Jurisdiction label'),
      taxType: z.string().optional().nullable().describe('Tax type'),
      description: z.string().optional().nullable().describe('Internal description'),
      created: z.number().optional().describe('Creation timestamp'),
      taxRates: z
        .array(
          z.object({
            taxRateId: z.string(),
            displayName: z.string(),
            percentage: z.number(),
            inclusive: z.boolean(),
            active: z.boolean(),
            jurisdiction: z.string().nullable(),
            taxType: z.string().nullable(),
            created: z.number()
          })
        )
        .optional()
        .describe('List of Tax Rates'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.displayName)
        throw stripeServiceError('displayName is required for create action');
      if (ctx.input.percentage === undefined)
        throw stripeServiceError('percentage is required for create action');
      if (ctx.input.inclusive === undefined)
        throw stripeServiceError('inclusive is required for create action');

      let params: Record<string, any> = {
        display_name: ctx.input.displayName,
        percentage: ctx.input.percentage,
        inclusive: ctx.input.inclusive
      };
      if (ctx.input.active !== undefined) params.active = ctx.input.active;
      if (ctx.input.country) params.country = ctx.input.country;
      if (ctx.input.state) params.state = ctx.input.state;
      if (ctx.input.jurisdiction) params.jurisdiction = ctx.input.jurisdiction;
      if (ctx.input.taxType) params.tax_type = ctx.input.taxType;
      if (ctx.input.description) params.description = ctx.input.description;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let taxRate = await client.createTaxRate(params);
      return {
        output: mapTaxRate(taxRate),
        message: `Created tax rate **${taxRate.display_name}** (${taxRate.id})`
      };
    }

    if (action === 'get') {
      if (!ctx.input.taxRateId)
        throw stripeServiceError('taxRateId is required for get action');
      let taxRate = await client.getTaxRate(ctx.input.taxRateId);
      return {
        output: mapTaxRate(taxRate),
        message: `Tax rate **${taxRate.display_name}** — ${taxRate.percentage}%`
      };
    }

    if (action === 'update') {
      if (!ctx.input.taxRateId)
        throw stripeServiceError('taxRateId is required for update action');

      let params: Record<string, any> = {};
      if (ctx.input.displayName) params.display_name = ctx.input.displayName;
      if (ctx.input.active !== undefined) params.active = ctx.input.active;
      if (ctx.input.country) params.country = ctx.input.country;
      if (ctx.input.state) params.state = ctx.input.state;
      if (ctx.input.jurisdiction) params.jurisdiction = ctx.input.jurisdiction;
      if (ctx.input.taxType) params.tax_type = ctx.input.taxType;
      if (ctx.input.description) params.description = ctx.input.description;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let taxRate = await client.updateTaxRate(ctx.input.taxRateId, params);
      return {
        output: mapTaxRate(taxRate),
        message: `Updated tax rate **${taxRate.display_name}**`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;
    if (ctx.input.active !== undefined) params.active = ctx.input.active;

    let result = await client.listTaxRates(params);
    return {
      output: {
        taxRates: result.data.map((taxRate: any) => mapTaxRate(taxRate)),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** tax rate(s)${result.has_more ? ' (more available)' : ''}`
    };
  })
  .build();
