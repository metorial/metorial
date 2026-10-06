import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { administrationIdSchema } from '../lib/schemas';
import { checkedOutput, exactId, validateToolInput } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  nextPage: z.number().int().positive().optional(),
  previousPage: z.number().int().positive().optional(),
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
});

export let listTaxRates = SlateTool.create(spec, {
  name: 'List Tax Rates',
  key: 'list_tax_rates',
  description: `List all available tax rates (VAT rates) in the Moneybird administration. Tax rate IDs are needed when creating invoices and estimates. Call list_administrations to choose administrationId when no default is saved.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      administrationId: administrationIdSchema
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    validateToolInput('list_tax_rates', ctx.input);
    return checkedOutput(outputSchema, async () => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.input.administrationId ?? ctx.config.administrationId
      });

      let taxRates = await client.listTaxRates();

      let mapped = taxRates.map((t: any) => ({
        taxRateId: exactId(t.id),
        name: t.name ?? null,
        percentage: t.percentage ?? null,
        taxRateType: t.tax_rate_type ?? null,
        active: t.active,
        createdAt: t.created_at ?? null,
        updatedAt: t.updated_at ?? null
      }));

      return {
        output: {
          taxRates: mapped,
          ...client.pagination
        },
        message: `Found ${mapped.length} tax rate(s).`
      };
    });
  })
  .build();
