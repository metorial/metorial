import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { collection, requiredId } from '../lib/response';
import { spec } from '../spec';

export let searchCompanies = SlateTool.create(spec, {
  name: 'Search Companies',
  key: 'search_companies',
  description: `Search for companies using keyword search or advanced filters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Full-text search query'),
      filters: z.any().optional().describe('Advanced filter object with boolean logic'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (max: 100)')
    })
  )
  .output(
    z.object({
      companies: z
        .array(
          z.object({
            companyId: z.string().describe('Company ID'),
            name: z.string().optional().describe('Company name'),
            website: z.string().optional().describe('Website'),
            isHot: z.boolean().optional().describe('Whether hot')
          })
        )
        .describe('Matching companies'),
      totalCount: z.number().optional().describe('Total results'),
      currentPage: z.number().optional().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.query !== undefined && ctx.input.filters !== undefined) {
      throw createApiServiceError('Provide query or filters, not both.');
    }
    let data: any;
    if (ctx.input.filters !== undefined) {
      data = await client.filterCompanies(ctx.input.filters, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    } else {
      data = await client.searchCompanies(ctx.input.query ?? '', {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    }

    let companies = collection(data, 'companies').map((c: any) => ({
      companyId: requiredId(c.id, 'record'),
      name: c.name ?? undefined,
      website: c.website ?? undefined,
      isHot: c.is_hot ?? undefined
    }));

    return {
      output: {
        companies,
        totalCount: data?.total ?? undefined,
        currentPage: data?.page ?? ctx.input.page ?? 1
      },
      message: `Found **${companies.length}** company(ies).`
    };
  })
  .build();
