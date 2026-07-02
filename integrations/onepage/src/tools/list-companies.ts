import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { companySchema } from '../lib/schemas';
import { spec } from '../spec';

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `List companies (organizations) in OnePageCRM. Companies are logical collections of contacts. Supports search and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter companies'),
      sortBy: z.string().optional().describe('Field to sort by'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      companies: z.array(companySchema).describe('List of companies'),
      totalCount: z.number().describe('Total number of matching companies'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.listCompanies(ctx.input);

    return {
      output: result,
      message: `Found **${result.totalCount}** companies (page ${result.page}, showing ${result.companies.length}).`
    };
  })
  .build();
