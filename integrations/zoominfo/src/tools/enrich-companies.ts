import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichCompanies = SlateTool.create(spec, {
  name: 'Enrich Companies',
  key: 'enrich_companies',
  description: `Retrieve full ZoomInfo company profiles for up to 25 companies per request. Returns detailed firmographics including revenue, employee count, industry, locations, technographics, and corporate hierarchy information. Match by company ID, domain, or name.`,
  instructions: [
    'Best practice: first use Search Companies to find IDs, then enrich by ID.',
    'Customize outputFields to limit the response to fields you actually need.'
  ],
  constraints: [
    'Each new record enrichment consumes 1 credit. Re-enriching the same record within 12 months is free.',
    'Maximum 25 companies per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      matchBy: z
        .enum(['companyId', 'domain', 'name'])
        .describe(
          'How to match companies: by ZoomInfo company ID, website domain, or company name'
        ),
      companyIds: z
        .array(z.number())
        .optional()
        .describe('ZoomInfo company IDs (when matchBy is "companyId")'),
      domains: z
        .array(z.string())
        .optional()
        .describe('Company website domains (when matchBy is "domain")'),
      companyNames: z
        .array(z.string())
        .optional()
        .describe('Company names (when matchBy is "name")'),
      outputFields: z
        .array(z.string())
        .optional()
        .describe(
          'Specific fields to return (e.g., ["companyName", "revenue", "employeeCount", "industry", "website", "city", "state", "country"])'
        )
    })
  )
  .output(
    z.object({
      companies: z
        .array(z.record(z.string(), z.any()))
        .describe('Enriched company records with full profile data'),
      matchCount: z.number().describe('Number of successfully matched companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let params: Record<string, any> = {};

    if (ctx.input.matchBy === 'companyId' && ctx.input.companyIds) {
      params.companyId = ctx.input.companyIds;
    } else if (ctx.input.matchBy === 'domain' && ctx.input.domains) {
      params.companyWebsite = ctx.input.domains;
    } else if (ctx.input.matchBy === 'name' && ctx.input.companyNames) {
      params.companyName = ctx.input.companyNames;
    }

    let result = await client.enrichCompanies(params, ctx.input.outputFields);

    let companies = result.data || result.result || [];

    return {
      output: {
        companies,
        matchCount: companies.length
      },
      message: `Enriched **${companies.length}** company/companies successfully.`
    };
  })
  .build();
