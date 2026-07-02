import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.number().describe('Unique ID of the comment'),
  body: z.string().nullable().describe('Comment text'),
  state: z.string().describe('State of the comment'),
  isAdminComment: z.boolean().describe('Whether this comment was posted by an admin'),
  channel: z.string().nullable().describe('Channel the comment came from'),
  createdAt: z.string().describe('When the comment was created'),
  updatedAt: z.string().describe('When the comment was last updated'),
  links: z
    .record(z.string(), z.any())
    .optional()
    .describe('Associated resource links (suggestion, created_by)')
});

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `List comments across suggestions. Comments are public discussion on ideas. Filter by suggestion or browse all comments. Supports pagination and date range filtering.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      suggestionId: z.number().optional().describe('Filter comments by suggestion ID'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 20, max: 100)'),
      sort: z.string().optional().describe('Sort field. Examples: "-created_at"'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return comments updated after this ISO 8601 date')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema),
      totalRecords: z.number().describe('Total number of matching comments'),
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
    if (ctx.input.updatedAfter) params.updatedAfter = ctx.input.updatedAfter;

    let result = await client.listComments(params);

    let comments = result.comments.map((c: any) => ({
      commentId: c.id,
      body: c.body || null,
      state: c.state || 'published',
      isAdminComment: c.is_admin_comment ?? false,
      channel: c.channel || null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      links: c.links
    }));

    return {
      output: {
        comments,
        totalRecords: result.pagination?.totalRecords || 0,
        totalPages: result.pagination?.totalPages || 0
      },
      message: `Found **${comments.length}** comments.`
    };
  })
  .build();
