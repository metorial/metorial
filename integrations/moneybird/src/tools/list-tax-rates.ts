import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

export let listTaxRates = SlateTool.create(spec, {
  name: 'List Tax Rates',
  key: 'list_tax_rates',
  description: `List all available tax rates (VAT rates) in the Moneybird administration. Tax rate IDs are needed when creating invoices and estimates.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      taxRates: z.array(
        z.object({
          taxRateId: z.string(),
          name: z.string().nullable(),
          percentage: z.string().nullable(),
          taxRateType: z.string().nullable(),
          active: z.boolean(),
          createdAt: z.string().nullable(),
          updatedAt: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let taxRates = await client.listTaxRates();

    let mapped = taxRates.map((t: any) => ({
      taxRateId: String(t.id),
      name: t.name || null,
      percentage: t.percentage || null,
      taxRateType: t.tax_rate_type || null,
      active: t.active ?? true,
      createdAt: t.created_at || null,
      updatedAt: t.updated_at || null
    }));

    return {
      output: { taxRates: mapped },
      message: `Found ${mapped.length} tax rate(s).`
    };
  });
