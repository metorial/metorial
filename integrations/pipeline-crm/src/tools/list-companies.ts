import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `List and search companies in Pipeline CRM with optional filtering. Returns paginated results.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 200, max: 200)'),
      companyName: z.string().optional().describe('Filter by company name (partial match)'),
      sort: z.string().optional().describe('Sort field (e.g., "name", "created_at")')
    })
  )
  .output(
    z.object({
      companies: z
        .array(
          z.object({
            companyId: z.number().describe('Unique company ID'),
            name: z.string().describe('Company name'),
            phone: z.string().nullable().optional().describe('Phone number'),
            website: z.string().nullable().optional().describe('Website'),
            industry: z.string().nullable().optional().describe('Industry'),
            userId: z.number().nullable().optional().describe('Owner user ID'),
            createdAt: z.string().nullable().optional().describe('Creation timestamp'),
            updatedAt: z.string().nullable().optional().describe('Last update timestamp')
          })
        )
        .describe('List of companies'),
      totalCount: z.number().describe('Total number of matching companies'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let conditions: Record<string, any> = {};
    if (ctx.input.companyName) conditions.company_name = ctx.input.companyName;

    let result = await client.listCompanies({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      conditions: Object.keys(conditions).length > 0 ? conditions : undefined,
      sort: ctx.input.sort
    });

    let companies = (result.entries ?? []).map((company: any) => ({
      companyId: company.id,
      name: company.name,
      phone: company.phone ?? null,
      website: company.website ?? null,
      industry: company.industry ?? null,
      userId: company.user_id ?? company.owner_id ?? null,
      createdAt: company.created_at ?? null,
      updatedAt: company.updated_at ?? null
    }));

    return {
      output: {
        companies,
        totalCount: result.pagination?.total ?? companies.length,
        currentPage: result.pagination?.page ?? 1,
        totalPages: result.pagination?.pages ?? 1
      },
      message: `Found **${result.pagination?.total ?? companies.length}** companies (page ${result.pagination?.page ?? 1} of ${result.pagination?.pages ?? 1})`
    };
  })
  .build();
