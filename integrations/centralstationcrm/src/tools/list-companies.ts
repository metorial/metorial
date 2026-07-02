import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let companySchema = z.object({
  companyId: z.number().describe('Company ID'),
  companyName: z.string().optional().describe('Company name'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `List companies in CentralStationCRM with pagination. Optionally search by name or include related data.`,
  constraints: ['Maximum 250 results per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter companies by name'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page (max 250)'),
      includes: z
        .string()
        .optional()
        .describe('Comma-separated list of related data to include (e.g., "people,tags")')
    })
  )
  .output(
    z.object({
      companies: z.array(companySchema).describe('List of companies'),
      count: z.number().describe('Number of companies returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result: any;
    if (ctx.input.query) {
      result = await client.searchCompanies(ctx.input.query, {
        page: ctx.input.page,
        perpage: ctx.input.perPage
      });
    } else {
      result = await client.listCompanies({
        page: ctx.input.page,
        perpage: ctx.input.perPage,
        includes: ctx.input.includes
      });
    }

    let items = Array.isArray(result) ? result : [];
    let companies = items.map((item: any) => {
      let company = item?.company ?? item;
      return {
        companyId: company.id,
        companyName: company.name,
        createdAt: company.created_at,
        updatedAt: company.updated_at
      };
    });

    return {
      output: {
        companies,
        count: companies.length
      },
      message: `Found **${companies.length}** companies${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
