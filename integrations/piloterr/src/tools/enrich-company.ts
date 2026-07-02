import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let enrichCompany = SlateTool.create(spec, {
  name: 'Enrich Company',
  key: 'enrich_company',
  description: `Search among 60 million companies and retrieve enriched company data by domain name. Returns business details including description, employee count, industry, location, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Company domain name to look up (e.g., "gucci.com")')
    })
  )
  .output(
    z.object({
      companyName: z.string().optional(),
      domain: z.string().optional(),
      description: z.string().optional(),
      industry: z.string().optional(),
      employeeCount: z.number().optional(),
      staffRange: z.string().optional(),
      founded: z.string().optional(),
      headquarters: z.any().optional(),
      website: z.string().optional(),
      logoUrl: z.string().optional(),
      specialities: z.array(z.string()).optional(),
      raw: z.any().describe('Full raw response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getCompanyInfo({ query: ctx.input.domain });

    return {
      output: {
        companyName: result.company_name ?? result.name,
        domain: result.domain ?? result.website,
        description: result.description,
        industry: result.industry,
        employeeCount: result.employee_count ?? result.staff_count,
        staffRange: result.staff_range,
        founded: result.founded,
        headquarters: result.headquarter ?? result.headquarters,
        website: result.website,
        logoUrl: result.logo_url ?? result.logo,
        specialities: result.specialities,
        raw: result
      },
      message: `Enriched company data for **${ctx.input.domain}**: ${result.company_name ?? result.name ?? 'Unknown company'}.`
    };
  })
  .build();
