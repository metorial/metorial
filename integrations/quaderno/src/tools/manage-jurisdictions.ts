import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let jurisdictionOutputSchema = z.object({
  jurisdictionId: z.string().optional().describe('Jurisdiction ID'),
  country: z.string().optional().describe('Country code'),
  region: z.string().optional().describe('Region/state code'),
  name: z.string().optional().describe('Jurisdiction name'),
  taxAccountNumber: z
    .string()
    .optional()
    .describe('Tax registration number for this jurisdiction'),
  status: z.string().optional().describe('Registration status')
});

export let listJurisdictions = SlateTool.create(spec, {
  name: 'List Tax Jurisdictions',
  key: 'list_jurisdictions',
  description: `Retrieve the list of tax jurisdictions where the business is registered for tax collection. Useful for understanding where the business has tax obligations.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      jurisdictions: z.array(jurisdictionOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listJurisdictions({ page: ctx.input.page });

    let jurisdictions = (Array.isArray(result) ? result : []).map((j: any) => ({
      jurisdictionId: j.id?.toString(),
      country: j.country,
      region: j.region,
      name: j.name,
      taxAccountNumber: j.tax_account_number,
      status: j.status
    }));

    return {
      output: { jurisdictions },
      message: `Found **${jurisdictions.length}** tax jurisdiction(s)`
    };
  })
  .build();

export let createJurisdiction = SlateTool.create(spec, {
  name: 'Register Tax Jurisdiction',
  key: 'create_jurisdiction',
  description: `Register a new tax jurisdiction where the business will collect taxes. This enables Quaderno to calculate taxes for this jurisdiction.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      country: z.string().describe('Two-letter ISO country code'),
      region: z.string().optional().describe('Region/state code'),
      taxAccountNumber: z
        .string()
        .optional()
        .describe('Tax registration number for this jurisdiction')
    })
  )
  .output(jurisdictionOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {
      country: ctx.input.country
    };
    if (ctx.input.region) data.region = ctx.input.region;
    if (ctx.input.taxAccountNumber) data.tax_account_number = ctx.input.taxAccountNumber;

    let j = await client.createJurisdiction(data);

    return {
      output: {
        jurisdictionId: j.id?.toString(),
        country: j.country,
        region: j.region,
        name: j.name,
        taxAccountNumber: j.tax_account_number,
        status: j.status
      },
      message: `Registered tax jurisdiction **${j.name || ctx.input.country}**`
    };
  })
  .build();

export let deleteJurisdiction = SlateTool.create(spec, {
  name: 'Remove Tax Jurisdiction',
  key: 'delete_jurisdiction',
  description: `Remove a tax jurisdiction registration. Quaderno will no longer calculate taxes for this jurisdiction.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      jurisdictionId: z.string().describe('ID of the jurisdiction to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the jurisdiction was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteJurisdiction(ctx.input.jurisdictionId);

    return {
      output: { success: true },
      message: `Removed tax jurisdiction **${ctx.input.jurisdictionId}**`
    };
  })
  .build();
