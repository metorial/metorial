import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `List all companies associated with your Remote account or integration. Returns company details including name, status, country, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      companies: z.array(z.record(z.string(), z.any())).describe('List of company records'),
      totalCount: z.number().optional().describe('Total number of companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    let result = await client.listCompanies(ctx.input.page, ctx.input.pageSize);
    let companies = result?.data ?? result?.companies ?? [];
    let totalCount = result?.total_count ?? companies.length;

    return {
      output: {
        companies,
        totalCount
      },
      message: `Found **${totalCount}** company/companies.`
    };
  });
