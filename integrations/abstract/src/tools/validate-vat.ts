import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

export let validateVat = SlateTool.create(spec, {
  name: 'VAT Lookup',
  key: 'vat_lookup',
  description: `Validates VAT numbers, calculates VAT for amounts, and retrieves VAT rates by country. Supports three modes:
- **Validate**: Check if a VAT number is valid and retrieve associated company info
- **Calculate**: Calculate VAT for a given amount and country
- **Rates**: Get current VAT rates and categories for a country`,
  instructions: [
    'VAT numbers should include the country prefix (e.g. "DE123456789", "FR12345678901").',
    'For calculation and rates, use 2-letter ISO country codes (e.g. "DE", "FR").'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z.enum(['validate', 'calculate', 'rates']).describe('Operation mode'),
      vatNumber: z
        .string()
        .optional()
        .describe(
          'VAT number to validate (include country prefix). Required for "validate" mode.'
        ),
      amount: z
        .number()
        .optional()
        .describe('Amount to calculate VAT for. Required for "calculate" mode.'),
      countryCode: z
        .string()
        .optional()
        .describe('2-letter ISO country code. Required for "calculate" and "rates" modes.'),
      isVatIncluded: z
        .boolean()
        .optional()
        .describe('Whether the amount already includes VAT. Used in "calculate" mode.'),
      vatCategory: z
        .string()
        .optional()
        .describe('VAT category (e.g. "standard", "reduced"). Used in "calculate" mode.')
    })
  )
  .output(
    z.object({
      // Validate mode
      vatNumber: z.string().optional().describe('The validated VAT number'),
      isValid: z.boolean().optional().describe('Whether the VAT number is valid'),
      companyName: z
        .string()
        .optional()
        .describe('Company name associated with the VAT number'),
      companyAddress: z.string().optional().describe('Company address'),
      countryCode: z.string().optional().describe('Country code'),
      countryName: z.string().optional().describe('Country name'),
      // Calculate mode
      amountExclVat: z.number().optional().describe('Amount excluding VAT'),
      amountInclVat: z.number().optional().describe('Amount including VAT'),
      vatAmount: z.number().optional().describe('VAT amount'),
      vatRate: z.number().optional().describe('Applied VAT rate percentage'),
      // Rates mode
      vatCategories: z
        .array(
          z.object({
            category: z.string().optional().describe('VAT category name'),
            rate: z.number().optional().describe('VAT rate for this category'),
            description: z.string().optional().describe('Category description')
          })
        )
        .optional()
        .describe('List of VAT categories and rates for the country')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbstractClient(ctx.auth);
    let { mode, vatNumber, amount, countryCode, isVatIncluded, vatCategory } = ctx.input;

    if (mode === 'validate') {
      if (!vatNumber) throw new Error('vatNumber is required for "validate" mode.');
      let result = await client.validateVat({ vatNumber });

      return {
        output: {
          vatNumber: result.vat_number ?? vatNumber,
          isValid: result.is_valid ?? undefined,
          companyName: result.company_name ?? undefined,
          companyAddress: result.company_address ?? undefined,
          countryCode: result.country_code ?? undefined,
          countryName: result.country_name ?? undefined
        },
        message: `VAT number **${vatNumber}** is **${result.is_valid ? 'valid' : 'invalid'}**${result.company_name ? ` — ${result.company_name}` : ''}.`
      };
    } else if (mode === 'calculate') {
      if (amount === undefined) throw new Error('amount is required for "calculate" mode.');
      if (!countryCode) throw new Error('countryCode is required for "calculate" mode.');

      let result = await client.calculateVat({
        amount,
        countryCode,
        isVatIncl: isVatIncluded,
        vatCategory
      });

      return {
        output: {
          countryCode: result.country_code ?? countryCode,
          countryName: result.country_name ?? undefined,
          amountExclVat:
            result.amount_excl_vat != null ? Number(result.amount_excl_vat) : undefined,
          amountInclVat:
            result.amount_incl_vat != null ? Number(result.amount_incl_vat) : undefined,
          vatAmount: result.vat_amount != null ? Number(result.vat_amount) : undefined,
          vatRate: result.vat_rate != null ? Number(result.vat_rate) : undefined
        },
        message: `VAT calculation for **${amount}** in **${countryCode}**: VAT amount **${result.vat_amount ?? 'N/A'}** at **${result.vat_rate ?? 'N/A'}%**.`
      };
    } else {
      if (!countryCode) throw new Error('countryCode is required for "rates" mode.');

      let result = await client.getVatRates({ countryCode });
      let categories = Array.isArray(result) ? result : [];

      let mappedCategories = categories.map((c: any) => ({
        category: c.country_code ?? c.category ?? undefined,
        rate: c.rate != null ? Number(c.rate) : undefined,
        description: c.description ?? c.category ?? undefined
      }));

      return {
        output: {
          countryCode,
          vatCategories: mappedCategories
        },
        message: `Retrieved **${mappedCategories.length}** VAT category(s) for **${countryCode}**.`
      };
    }
  })
  .build();
