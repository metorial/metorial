import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let validateTaxId = SlateTool.create(spec, {
  name: 'Validate Tax ID',
  key: 'validate_tax_id',
  description: `Validate a tax identification number (VAT number, GST number, etc.) against official registries such as EU VIES. Returns whether the tax ID is valid along with associated details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      country: z.string().describe('Two-letter ISO country code (e.g., "DE", "FR", "GB")'),
      taxId: z.string().describe('Tax identification number to validate')
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the tax ID is valid'),
      companyName: z
        .string()
        .optional()
        .describe('Registered company name associated with the tax ID'),
      companyAddress: z.string().optional().describe('Registered company address')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.validateTaxId({
      country: ctx.input.country,
      tax_id: ctx.input.taxId
    });

    return {
      output: {
        valid: result.valid,
        companyName: result.company_name,
        companyAddress: result.company_address
      },
      message: result.valid
        ? `Tax ID **${ctx.input.taxId}** is **valid**${result.company_name ? ` (${result.company_name})` : ''}`
        : `Tax ID **${ctx.input.taxId}** is **invalid**`
    };
  })
  .build();
