import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { intercomServiceError } from '../lib/errors';
import { numberOrUndefined, stringOrUndefined, timestampOrUndefined } from '../lib/output';
import { spec } from '../spec';

type CompanyListParams = {
  name?: string;
  companyId?: string;
  tagId?: string;
  segmentId?: string;
};

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `List or filter companies in Intercom. Supports paginated listing and provider-supported filters for name, company_id, tag_id, and segment_id.`,
  instructions: [
    'Use "list" mode for paginated listing of all companies.',
    'Use "search" mode with a simple "=" query on "name", "company_id", "tag_id", or "segment_id".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['list', 'search'])
        .default('list')
        .describe('Whether to list all companies or search with a query'),
      query: z.any().optional().describe('Simple query filter required for search mode'),
      page: z.number().optional().describe('Page number for list mode'),
      perPage: z.number().optional().describe('Results per page'),
      paginationCursor: z.string().optional().describe('Cursor for next page (search mode)')
    })
  )
  .output(
    z.object({
      companies: z
        .array(
          z.object({
            intercomCompanyId: z.string().describe('Intercom company ID'),
            companyId: z.string().optional().describe('External company ID'),
            name: z.string().optional().describe('Company name'),
            plan: z.string().optional().describe('Plan name'),
            size: z.number().optional().describe('Company size'),
            userCount: z.number().optional().describe('Number of users'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of companies'),
      totalCount: z.number().optional().describe('Total number of companies'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result: any;
    if (ctx.input.mode === 'search' && ctx.input.query) {
      result = await client.listCompanies({
        ...getCompanySearchParams(ctx.input.query),
        perPage: ctx.input.perPage
      });
    } else {
      result = await client.listCompanies({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    }

    let companies = (result.data || []).map((c: any) => ({
      intercomCompanyId: String(c.id),
      companyId: stringOrUndefined(c.company_id),
      name: stringOrUndefined(c.name),
      plan: stringOrUndefined(c.plan?.name),
      size: numberOrUndefined(c.size),
      userCount: numberOrUndefined(c.user_count),
      createdAt: timestampOrUndefined(c.created_at)
    }));

    return {
      output: {
        companies,
        totalCount: result.total_count,
        hasMore: !!result.pages?.next
      },
      message: `Found **${result.total_count ?? companies.length}** companies (showing ${companies.length})`
    };
  })
  .build();

let getCompanySearchParams = (query: any): CompanyListParams => {
  if (!query || typeof query !== 'object' || Array.isArray(query)) {
    throw intercomServiceError('list_companies search mode requires a simple query object');
  }

  if (query.operator !== undefined && query.operator !== '=') {
    throw intercomServiceError(
      'list_companies search mode only supports "=" filters for Intercom companies'
    );
  }

  let value = stringOrUndefined(query.value);
  if (!value) {
    throw intercomServiceError('list_companies search query requires a value');
  }

  if (query.field === 'name') return { name: value };
  if (query.field === 'company_id' || query.field === 'companyId') {
    return { companyId: value };
  }
  if (query.field === 'tag_id' || query.field === 'tagId') return { tagId: value };
  if (query.field === 'segment_id' || query.field === 'segmentId') {
    return { segmentId: value };
  }

  throw intercomServiceError(
    'list_companies search mode supports only name, company_id, tag_id, and segment_id'
  );
};
