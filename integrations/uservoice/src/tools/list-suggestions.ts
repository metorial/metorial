import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let suggestionSchema = z.object({
  suggestionId: z.number().describe('Unique ID of the suggestion'),
  title: z.string().describe('Title of the suggestion'),
  body: z.string().nullable().describe('Body/description of the suggestion'),
  state: z.string().describe('Current state (e.g., published, approved, closed)'),
  votesCount: z.number().describe('Number of votes'),
  commentsCount: z.number().describe('Number of comments'),
  supportersCount: z.number().describe('Number of supporters'),
  createdAt: z.string().describe('When the suggestion was created'),
  updatedAt: z.string().describe('When the suggestion was last updated'),
  links: z
    .record(z.string(), z.any())
    .optional()
    .describe('Associated resource links (forum, category, status, labels, etc.)')
});

export let listSuggestions = SlateTool.create(spec, {
  name: 'List Suggestions',
  key: 'list_suggestions',
  description: `Search and list suggestions (ideas) in UserVoice. Supports filtering by forum, sorting, and pagination. Use this to browse product feedback, find popular ideas, or audit recent submissions.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      forumId: z.number().optional().describe('Filter by forum ID'),
      sort: z
        .string()
        .optional()
        .describe(
          'Sort field. Prefix with "-" for descending. Examples: "-supporters_count", "-created_at", "updated_at"'
        ),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 20, max: 100)'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return suggestions updated after this ISO 8601 date'),
      state: z
        .string()
        .optional()
        .describe('Filter by state (e.g., "published", "approved", "closed")')
    })
  )
  .output(
    z.object({
      suggestions: z.array(suggestionSchema),
      totalRecords: z.number().describe('Total number of matching suggestions'),
      totalPages: z.number().describe('Total number of pages'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.forumId) params.forum = ctx.input.forumId;
    if (ctx.input.sort) params.sort = ctx.input.sort;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.perPage) params.perPage = ctx.input.perPage;
    if (ctx.input.updatedAfter) params.updatedAfter = ctx.input.updatedAfter;
    if (ctx.input.state) params.state = ctx.input.state;

    let result = await client.listSuggestions(params);

    let suggestions = result.suggestions.map((s: any) => ({
      suggestionId: s.id,
      title: s.title,
      body: s.body || null,
      state: s.state,
      votesCount: s.votes_count || 0,
      commentsCount: s.comments_count || 0,
      supportersCount: s.supporters_count || 0,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      links: s.links
    }));

    return {
      output: {
        suggestions,
        totalRecords: result.pagination?.totalRecords || 0,
        totalPages: result.pagination?.totalPages || 0,
        currentPage: result.pagination?.page || ctx.input.page || 1
      },
      message: `Found **${suggestions.length}** suggestions (page ${result.pagination?.page || 1} of ${result.pagination?.totalPages || 1}).`
    };
  })
  .build();
