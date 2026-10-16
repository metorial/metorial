import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let supporterSchema = z.object({
  supporterId: z.number().describe('Unique ID of the supporter record'),
  isSubscribed: z
    .boolean()
    .optional()
    .describe('Whether the supporter is subscribed to updates'),
  how: z.string().nullable().describe('How the supporter was added'),
  channel: z.string().nullable().describe('Channel through which support was given'),
  requestsCount: z.number().optional().describe('Number of requests from this supporter'),
  commentsCount: z.number().optional().describe('Number of comments from this supporter'),
  createdAt: z.string().optional().describe('When the supporter was added'),
  updatedAt: z.string().optional().describe('When the supporter record was last updated'),
  links: z
    .record(z.string(), z.any())
    .optional()
    .describe('Associated resource links (suggestion, user)'),
  raw: z.record(z.string(), z.unknown()).optional().describe('Full provider record')
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
      supporters: z.array(supporterSchema).optional(),
      totalRecords: z.number().optional().describe('Total number of matching supporters'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain,
      legacySubdomain: ctx.config.subdomain
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.suggestionId !== undefined) params.suggestion = ctx.input.suggestionId;
    if (ctx.input.page !== undefined) params.page = ctx.input.page;
    if (ctx.input.perPage !== undefined) params.perPage = ctx.input.perPage;
    if (ctx.input.sort) params.sort = ctx.input.sort;

    let result = await client.listSupporters(params);

    let supporters = result.supporters?.map((s: any) => ({
      supporterId: s.id,
      isSubscribed: s.is_subscribed,
      how: s.how ?? null,
      channel: s.channel ?? null,
      requestsCount: s.requests_count,
      commentsCount: s.comments_count,
      createdAt: s.created_at ?? undefined,
      updatedAt: s.updated_at ?? undefined,
      links: s.links,
      raw: s
    }));

    return {
      output: {
        supporters,
        totalRecords: result.pagination?.totalRecords,
        totalPages: result.pagination?.totalPages
      },
      message: 'Retrieved UserVoice records.'
    };
  })
  .build();
