import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let listCompaniesTool = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `List companies in your Canny account. Supports searching by name and filtering by segment. Companies track organizational data like member count and monthly spend (MRR).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter companies by name'),
      segment: z.string().optional().describe('Segment ID to filter by'),
      limit: z.number().optional().describe('Number of companies to return (max 100)'),
      cursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      companies: z
        .array(
          z.object({
            companyId: z.string().describe('Company ID'),
            name: z.string().describe('Company name'),
            domain: z.string().nullable().describe('Company domain'),
            memberCount: z.number().describe('Number of members'),
            monthlySpend: z.number().nullable().describe('Monthly spend / MRR'),
            created: z.string().describe('Creation timestamp'),
            customFields: z
              .record(z.string(), z.any())
              .optional()
              .describe('Custom field values')
          })
        )
        .describe('List of companies'),
      cursor: z.string().nullable().describe('Cursor for the next page'),
      hasNextPage: z.boolean().describe('Whether more companies are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.listCompanies({
      search: ctx.input.search,
      segment: ctx.input.segment,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let companies = (result.companies || []).map((c: any) => ({
      companyId: c.id,
      name: c.name,
      domain: c.domain || null,
      memberCount: c.memberCount,
      monthlySpend: c.monthlySpend ?? null,
      created: c.created,
      customFields: c.customFields
    }));

    return {
      output: {
        companies,
        cursor: result.cursor || null,
        hasNextPage: result.hasNextPage
      },
      message: `Found **${companies.length}** company(ies)${result.hasNextPage ? ' (more available)' : ''}.`
    };
  })
  .build();
