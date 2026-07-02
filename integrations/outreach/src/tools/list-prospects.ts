import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildFilterParams, flattenResource } from '../lib/helpers';
import { spec } from '../spec';

let prospectSummarySchema = z.object({
  prospectId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  accountId: z.string().optional(),
  ownerId: z.string().optional(),
  updatedAt: z.string().optional()
});

export let listProspects = SlateTool.create(spec, {
  name: 'List Prospects',
  key: 'list_prospects',
  description: `Search and list prospects from Outreach. Supports filtering by email, name, account, owner, and tags. Returns paginated results.`,
  tags: {
    readOnly: true
  },
  constraints: [
    'Returns up to 50 results per page by default. Use pageSize and pageOffset for pagination.'
  ]
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by email address'),
      firstName: z.string().optional().describe('Filter by first name'),
      lastName: z.string().optional().describe('Filter by last name'),
      accountId: z.string().optional().describe('Filter by account ID'),
      ownerId: z.string().optional().describe('Filter by owner user ID'),
      tag: z.string().optional().describe('Filter by tag'),
      pageSize: z.number().optional().describe('Number of results per page (max 1000)'),
      pageOffset: z.number().optional().describe('Page offset for pagination'),
      sortBy: z
        .string()
        .optional()
        .describe('Sort field (e.g. "createdAt", "-updatedAt" for descending)')
    })
  )
  .output(
    z.object({
      prospects: z.array(prospectSummarySchema),
      hasMore: z.boolean(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let filterParams = buildFilterParams({
      emails: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      'account/id': ctx.input.accountId,
      'owner/id': ctx.input.ownerId,
      tags: ctx.input.tag
    });

    let params: Record<string, string> = {
      ...filterParams
    };

    if (ctx.input.pageSize) params['page[size]'] = ctx.input.pageSize.toString();
    if (ctx.input.pageOffset !== undefined)
      params['page[offset]'] = ctx.input.pageOffset.toString();
    if (ctx.input.sortBy) params.sort = ctx.input.sortBy;

    let result = await client.listProspects(params);

    let prospects = result.records.map(r => {
      let flat = flattenResource(r);
      return {
        prospectId: flat.id,
        firstName: flat.firstName,
        lastName: flat.lastName,
        email: flat.emails?.[0],
        title: flat.title,
        company: flat.company,
        accountId: flat.accountId,
        ownerId: flat.ownerId,
        updatedAt: flat.updatedAt
      };
    });

    return {
      output: {
        prospects,
        hasMore: result.hasMore,
        totalCount: result.totalCount ?? undefined
      },
      message: `Found **${prospects.length}** prospects${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
