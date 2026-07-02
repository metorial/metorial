import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let calculateTax = SlateTool.create(spec, {
  name: 'Calculate Tax',
  key: 'calculate_tax',
  description: `Calculate the applicable tax rate for a transaction based on the customer's location, product type, and tax jurisdiction. Useful for determining the correct sales tax, VAT, or GST at checkout. Covers 12,000+ tax jurisdictions worldwide.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      toCountry: z
        .string()
        .describe('Two-letter ISO country code of the customer (e.g., "US", "DE", "GB")'),
      toPostalCode: z.string().optional().describe('Postal/ZIP code of the customer'),
      toCity: z.string().optional().describe('City of the customer'),
      fromCountry: z.string().optional().describe('Two-letter ISO country code of the seller'),
      taxCode: z
        .string()
        .optional()
        .describe('Product tax code (e.g., "eservice", "saas", "ebook", "standard")'),
      amount: z.number().optional().describe('Transaction amount for tax calculation'),
      customerTaxId: z
        .string()
        .optional()
        .describe('Customer tax ID (e.g., EU VAT number) for reverse charge checks')
    })
  )
  .output(
    z.object({
      name: z.string().optional().describe('Tax name (e.g., "VAT", "Sales Tax")'),
      rate: z.number().optional().describe('Tax rate as a percentage'),
      country: z.string().optional().describe('Country code the tax applies to'),
      region: z.string().optional().describe('Region or state the tax applies to'),
      taxCode: z.string().optional().describe('Tax code applied'),
      taxBehavior: z.string().optional().describe('Whether tax is inclusive or exclusive'),
      extraTax: z.any().optional().describe('Additional tax details if applicable')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.calculateTax({
      to_country: ctx.input.toCountry,
      to_postal_code: ctx.input.toPostalCode,
      to_city: ctx.input.toCity,
      from_country: ctx.input.fromCountry,
      tax_code: ctx.input.taxCode,
      amount: ctx.input.amount,
      tax_id: ctx.input.customerTaxId
    });

    return {
      output: {
        name: result.name,
        rate: result.rate,
        country: result.country,
        region: result.region,
        taxCode: result.tax_code,
        taxBehavior: result.tax_behavior,
        extraTax: result.extra_tax
      },
      message: `Tax calculated: **${result.name || 'Tax'}** at **${result.rate}%** for ${ctx.input.toCountry}${ctx.input.toPostalCode ? ` (${ctx.input.toPostalCode})` : ''}`
    };
  })
  .build();
