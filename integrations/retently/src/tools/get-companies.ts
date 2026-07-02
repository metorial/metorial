import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompanies = SlateTool.create(spec, {
  name: 'Get Companies',
  key: 'get_companies',
  description: `Retrieve company information from Retently. Look up a single company by ID or domain name, or list companies with pagination and sorting.
Company data includes industry, tags, NPS/CSAT/CES/Star metrics, and customer counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyIdOrDomain: z
        .string()
        .optional()
        .describe('Look up a company by its Retently ID or domain name'),
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Items per page (default: 20, max: 1000)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field (e.g., -createdDate, domain, companyName, cxMetrics.NPS)')
    })
  )
  .output(
    z.object({
      companies: z.array(z.any()).optional().describe('List of companies'),
      page: z.number().optional().describe('Current page number'),
      total: z.number().optional().describe('Total number of companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.companyIdOrDomain) {
      let data = await client.getCompany(ctx.input.companyIdOrDomain);
      return {
        output: { companies: [data] },
        message: `Retrieved company **${ctx.input.companyIdOrDomain}**.`
      };
    }

    let data = await client.getCompanies({
      page: ctx.input.page,
      limit: ctx.input.limit,
      sort: ctx.input.sort
    });

    return {
      output: {
        companies: data.companies,
        page: data.page,
        total: data.total
      },
      message: `Retrieved **${data.companies?.length ?? 0}** company/companies (page ${data.page ?? 1}).`
    };
  })
  .build();
