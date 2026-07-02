import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

export let enrichCompany = SlateTool.create(spec, {
  name: 'Enrich Company',
  key: 'enrich_company',
  description: `Retrieve detailed enrichment data for one or more companies using their domain, name, or Crustdata ID.
Returns 250+ data points including headcount metrics, funding, investors, web traffic, job openings, news articles, employer reviews, and product reviews.
Supports real-time crawling for companies not yet in the database.`,
  instructions: [
    'Provide at least one of: companyDomain, companyName, or companyId.',
    'Use the fields parameter to request only specific data points and reduce response size.',
    'Enable enrichRealtime to fetch data for companies not yet in the Crustdata database (may take up to 10 minutes).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyDomain: z
        .string()
        .optional()
        .describe(
          'Company website domain (e.g., "hubspot.com"). Supports comma-separated values for multiple companies.'
        ),
      companyName: z.string().optional().describe('Company name to look up.'),
      companyId: z.string().optional().describe('Crustdata company ID.'),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Specific fields to retrieve (e.g., ["company_name", "headcount.headcount", "job_openings", "news_articles"]).'
        ),
      enrichRealtime: z
        .boolean()
        .optional()
        .describe('Enable real-time enrichment for companies not in the database.')
    })
  )
  .output(
    z.object({
      companies: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of enriched company data objects.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrustdataClient(ctx.auth.token);

    let result = await client.enrichCompany({
      companyDomain: ctx.input.companyDomain,
      companyName: ctx.input.companyName,
      companyId: ctx.input.companyId,
      fields: ctx.input.fields,
      enrichRealtime: ctx.input.enrichRealtime
    });

    let companies = Array.isArray(result) ? result : [result];

    return {
      output: { companies },
      message: `Enriched **${companies.length}** company(ies) successfully.`
    };
  })
  .build();
