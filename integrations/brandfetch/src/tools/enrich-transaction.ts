import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrandApiClient } from '../lib/client';
import { spec } from '../spec';

export let enrichTransaction = SlateTool.create(spec, {
  name: 'Enrich Transaction',
  key: 'enrich_transaction',
  description: `Resolve a raw payment transaction descriptor (e.g., a bank statement line item like "STARBUCKS 1523 OMAHA NE") to an identified merchant brand.
Returns the merchant's brand data including name, domain, logos, industry, and other brand assets.`,
  instructions: [
    'Provide the raw transaction text exactly as it appears on the bank or credit card statement.',
    'The country code helps narrow down the merchant locale for more accurate matching.'
  ],
  constraints: ['Counts against Brand API usage quotas.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionLabel: z
        .string()
        .describe(
          'Raw transaction descriptor text from a bank or credit card statement, e.g. "STARBUCKS 1523 OMAHA NE"'
        ),
      countryCode: z
        .string()
        .describe(
          'ISO 3166-1 alpha-2 country code for the transaction locale, e.g. "US", "GB", "DE"'
        )
    })
  )
  .output(
    z.object({
      brandName: z.string().describe('Resolved merchant brand name'),
      domain: z.string().describe('Merchant brand domain'),
      claimed: z.boolean().describe('Whether the brand has been claimed'),
      description: z.string().nullable().describe('Brand description'),
      qualityScore: z.number().describe('Data quality score (0-1)'),
      isNsfw: z.boolean().describe('Whether the brand relates to adult content'),
      logos: z
        .array(
          z.object({
            type: z.string().describe('Logo type: icon, logo, or symbol'),
            theme: z.string().nullable().describe('Theme variant: light or dark'),
            formats: z.array(
              z.object({
                src: z.string().describe('URL to the asset'),
                background: z.string().nullable().describe('Background type'),
                format: z.string().describe('File format'),
                height: z.number().optional().describe('Height in pixels'),
                width: z.number().optional().describe('Width in pixels'),
                size: z.number().optional().describe('File size in bytes')
              })
            )
          })
        )
        .describe('Merchant brand logos'),
      colors: z
        .array(
          z.object({
            hex: z.string().describe('Hex color code'),
            type: z.string().describe('Color type'),
            brightness: z.number().describe('Brightness value')
          })
        )
        .describe('Brand color palette'),
      company: z
        .object({
          employees: z.number().nullable().describe('Number of employees'),
          foundedYear: z.number().nullable().describe('Year founded'),
          kind: z.string().nullable().describe('Company type'),
          industries: z
            .array(
              z.object({
                name: z.string().describe('Industry name'),
                slug: z.string().describe('Industry slug')
              })
            )
            .describe('Industry classifications')
        })
        .nullable()
        .describe('Company firmographic data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrandApiClient(ctx.auth.token);

    let brand = await client.enrichTransaction({
      transactionLabel: ctx.input.transactionLabel,
      countryCode: ctx.input.countryCode
    });

    let company = brand.company
      ? {
          employees: brand.company.employees,
          foundedYear: brand.company.foundedYear,
          kind: brand.company.kind,
          industries: (brand.company.industries || []).map(ind => ({
            name: ind.name,
            slug: ind.slug
          }))
        }
      : null;

    return {
      output: {
        brandName: brand.name,
        domain: brand.domain,
        claimed: brand.claimed,
        description: brand.description,
        qualityScore: brand.qualityScore,
        isNsfw: brand.isNsfw,
        logos: brand.logos.map(logo => ({
          type: logo.type,
          theme: logo.theme,
          formats: logo.formats.map(f => ({
            src: f.src,
            background: f.background,
            format: f.format,
            height: f.height,
            width: f.width,
            size: f.size
          }))
        })),
        colors: brand.colors,
        company
      },
      message: `Resolved transaction "${ctx.input.transactionLabel}" to **${brand.name}** (${brand.domain}).`
    };
  })
  .build();
