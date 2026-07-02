import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichCompany = SlateTool.create(spec, {
  name: 'Enrich Company',
  key: 'enrich_company',
  description: `Enrich a company profile using a company name, website URL, or SIREN number. Returns company data including industry, tags, locations, employee count, technology used, social presence, and funding details.
Optionally retrieve premium LinkedIn data, financial/Crunchbase data, French SIREN directory info, and website traffic analytics.`,
  instructions: [
    'Provide a company name, website URL, or SIREN number as the identifier.',
    'Set companyPremium to true for LinkedIn company details like employee count, specialties, and locations.',
    'Set companyFull to true for financial data from Crunchbase including funding rounds and revenue.',
    'Set companyFrench to true for SIREN directory information (French companies only).'
  ],
  constraints: ['Rate limited to 10 requests per second.', '1 credit per enrichment.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyIdentifier: z
        .string()
        .describe('Company name, website URL, or SIREN number to look up'),
      companyPremium: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'Include detailed LinkedIn company data (employees, specialties, locations)'
        ),
      companyFull: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include financial and Crunchbase company data (funding, revenue, traffic)'),
      companyFrench: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include French SIREN directory data for French companies'),
      deepTraffic: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include website traffic analytics by country and source')
    })
  )
  .output(
    z.object({
      company: z
        .any()
        .optional()
        .describe(
          'Company data including name, industry, size, locations, specialties, funding'
        ),
      creditBurn: z.number().optional().describe('Number of credits consumed by this request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.enrichFull({
      data: ctx.input.companyIdentifier,
      companyPremium: ctx.input.companyPremium,
      companyFull: ctx.input.companyFull,
      companyFrench: ctx.input.companyFrench,
      deepTraffic: ctx.input.deepTraffic
    });

    let companyName = result?.company?.name || ctx.input.companyIdentifier;

    return {
      output: {
        company: result?.company,
        creditBurn: result?.creditBurn
      },
      message: `Enriched company **${companyName}**. Credits used: ${result?.creditBurn ?? 'N/A'}.`
    };
  })
  .build();
