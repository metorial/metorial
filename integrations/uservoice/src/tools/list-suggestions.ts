import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let suggestionSchema = z.object({
  suggestionId: z.number().describe('Unique ID of the suggestion'),
  title: z.string().optional().describe('Title of the suggestion'),
  body: z.string().nullable().describe('Body/description of the suggestion'),
  state: z.string().describe('Current state (e.g., published, approved, closed)'),
  votesCount: z.number().optional().describe('Number of votes'),
  commentsCount: z.number().optional().describe('Number of comments'),
  supportersCount: z.number().optional().describe('Number of supporters'),
  createdAt: z.string().optional().describe('When the suggestion was created'),
  updatedAt: z.string().optional().describe('When the suggestion was last updated'),
  links: z
    .record(z.string(), z.any())
    .optional()
    .describe('Associated resource links (forum, category, status, labels, etc.)'),
  raw: z.record(z.string(), z.unknown()).optional().describe('Full provider record')
});

export let listSuggestions = SlateTool.create(spec, {
  name: 'List Suggestions',
  key: 'list_suggestions',
  description: `Search and list suggestions (ideas) in UserVoice. Supports filtering by forum, sorting, and pagination. Use this to browse product feedback, find popular ideas, or audit recent submissions.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search suggestion titles and descriptions'),
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
      suggestions: z.array(suggestionSchema).optional(),
      totalRecords: z.number().optional().describe('Total number of matching suggestions'),
      totalPages: z.number().optional().describe('Total number of pages'),
      currentPage: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain,
      legacySubdomain: ctx.config.subdomain
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.query !== undefined) params.q = ctx.input.query;
    if (ctx.input.forumId !== undefined) params.forum = ctx.input.forumId;
    if (ctx.input.sort) params.sort = ctx.input.sort;
    if (ctx.input.page !== undefined) params.page = ctx.input.page;
    if (ctx.input.perPage !== undefined) params.perPage = ctx.input.perPage;
    if (ctx.input.updatedAfter) params.updatedAfter = ctx.input.updatedAfter;
    if (ctx.input.state) params.state = ctx.input.state;

    let result = await client.listSuggestions(params);

    let suggestions = result.suggestions?.map((s: any) => ({
      suggestionId: s.id,
      title: s.title ?? undefined,
      body: s.body ?? null,
      state: s.state,
      votesCount: s.votes_count,
      commentsCount: s.comments_count,
      supportersCount: s.supporters_count,
      createdAt: s.created_at ?? undefined,
      updatedAt: s.updated_at ?? undefined,
      links: s.links,
      raw: s
    }));

    return {
      output: {
        suggestions,
        totalRecords: result.pagination?.totalRecords,
        totalPages: result.pagination?.totalPages,
        currentPage: result.pagination?.page
      },
      message: 'Retrieved UserVoice records.'
    };
  })
  .build();
