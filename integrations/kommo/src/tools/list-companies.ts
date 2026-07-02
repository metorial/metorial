import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { companyOutputSchema, mapCompany } from '../lib/schemas';
import { spec } from '../spec';

export let listCompaniesTool = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `Search and list companies in Kommo. Supports filtering by search query, responsible user, and company IDs. Returns companies with tags and custom fields.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Full-text search query'),
      companyIds: z.array(z.number()).optional().describe('Filter by specific company IDs'),
      responsibleUserIds: z
        .array(z.number())
        .optional()
        .describe('Filter by responsible user IDs'),
      orderBy: z.enum(['created_at', 'updated_at', 'id']).optional().describe('Sort field'),
      orderDir: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page (max 250)')
    })
  )
  .output(
    z.object({
      companies: z.array(companyOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let companies = await client.listCompanies(
      {
        query: ctx.input.query,
        ids: ctx.input.companyIds,
        responsibleUserIds: ctx.input.responsibleUserIds,
        orderBy: ctx.input.orderBy,
        orderDir: ctx.input.orderDir
      },
      { page: ctx.input.page, limit: ctx.input.limit }
    );

    let mapped = companies.map(mapCompany);

    return {
      output: { companies: mapped },
      message: `Found **${mapped.length}** company(ies).`
    };
  })
  .build();
