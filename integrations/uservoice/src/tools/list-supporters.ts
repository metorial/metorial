import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let supporterSchema = z.object({
  supporterId: z.number().describe('Unique ID of the supporter record'),
  isSubscribed: z.boolean().describe('Whether the supporter is subscribed to updates'),
  how: z.string().nullable().describe('How the supporter was added'),
  channel: z.string().nullable().describe('Channel through which support was given'),
  requestsCount: z.number().describe('Number of requests from this supporter'),
  commentsCount: z.number().describe('Number of comments from this supporter'),
  createdAt: z.string().describe('When the supporter was added'),
  updatedAt: z.string().describe('When the supporter record was last updated'),
  links: z
    .record(z.string(), z.any())
    .optional()
    .describe('Associated resource links (suggestion, user)')
});

export let listSupporters = SlateTool.create(spec, {
  name: 'List Supporters',
  key: 'list_supporters',
  description: `List supporters across suggestions. Supporters are end users who have voted for or supported an idea. Filter by suggestion to see who supports a specific idea.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      suggestionId: z.number().optional().describe('Filter supporters by suggestion ID'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 20, max: 100)'),
      sort: z.string().optional().describe('Sort field. Examples: "-created_at"')
    })
  )
  .output(
    z.object({
      supporters: z.array(supporterSchema),
      totalRecords: z.number().describe('Total number of matching supporters'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.suggestionId) params.suggestion = ctx.input.suggestionId;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.perPage) params.perPage = ctx.input.perPage;
    if (ctx.input.sort) params.sort = ctx.input.sort;

    let result = await client.listSupporters(params);

    let supporters = result.supporters.map((s: any) => ({
      supporterId: s.id,
      isSubscribed: s.is_subscribed ?? true,
      how: s.how || null,
      channel: s.channel || null,
      requestsCount: s.requests_count || 0,
      commentsCount: s.comments_count || 0,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      links: s.links
    }));

    return {
      output: {
        supporters,
        totalRecords: result.pagination?.totalRecords || 0,
        totalPages: result.pagination?.totalPages || 0
      },
      message: `Found **${supporters.length}** supporters.`
    };
  })
  .build();
