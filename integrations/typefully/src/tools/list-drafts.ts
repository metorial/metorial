import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  draftOrderByValues,
  enabledDraftPlatforms,
  providerId,
  TypefullyClient
} from '../lib/client';
import { spec } from '../spec';

let draftSummarySchema = z.object({
  draftId: z.string().describe('ID of the draft'),
  status: z.string().describe('Draft status (draft, scheduled, published, publishing, error)'),
  publishState: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Publishing progress; in_progress means accepted asynchronously. Poll get_draft until finished.'
    ),
  createdAt: z.string().describe('When the draft was created'),
  updatedAt: z.string().describe('When the draft was last updated'),
  scheduledDate: z.string().nullable().describe('Scheduled publication time'),
  publishedAt: z.string().nullable().describe('When the draft was published'),
  draftTitle: z.string().nullable().describe('Internal title'),
  tags: z.array(z.string()).describe('Tags assigned to the draft'),
  preview: z.string().nullable().describe('Preview text of the content'),
  enabledPlatforms: z.array(z.string()).describe('Platforms this draft targets')
});

export let listDrafts = SlateTool.create(spec, {
  name: 'List Drafts',
  key: 'list_drafts',
  description: `List and filter drafts in a social set. Filter by status (draft, scheduled, published) or tag to find specific content. Supports pagination for browsing large numbers of drafts.`,
  instructions: [
    'Use the status filter to find drafts in a specific state.',
    'Prefer orderBy for documented draft ordering; a leading minus sorts descending. Omit it to use the provider default (-updated_at).',
    'Use either orderBy or the legacy sort field, never both. Legacy sort is forwarded unchanged; current provider acceptance is unverified.',
    'Results are paginated — use limit and offset for browsing.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      socialSetId: z
        .string()
        .describe('Social set ID. Call list_social_sets to discover accessible social sets.'),
      status: z
        .enum(['draft', 'scheduled', 'published', 'planned', 'publishing', 'error'])
        .optional()
        .describe('Filter by draft status'),
      tag: z.string().optional().describe('Filter by tag name'),
      sort: z.string().optional().describe('Sort field (e.g. "created_at", "scheduled_date")'),
      orderBy: z
        .enum(draftOrderByValues)
        .optional()
        .describe(
          'Documented ordering field; prefix with - for descending order. Mutually exclusive with legacy sort.'
        ),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of results per page (1-50, default: 10)'),
      offset: z.number().min(0).optional().describe('Pagination offset (default: 0)')
    })
  )
  .output(
    z.object({
      drafts: z.array(draftSummarySchema).describe('List of drafts'),
      totalCount: z.number().describe('Total number of matching drafts'),
      limit: z.number().describe('Results per page'),
      offset: z.number().describe('Current pagination offset'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypefullyClient(ctx.auth.token);

    let result = await client.listDrafts({
      socialSetId: ctx.input.socialSetId,
      status: ctx.input.status,
      tag: ctx.input.tag,
      sort: ctx.input.sort,
      orderBy: ctx.input.orderBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let drafts = result.results.map(draft => {
      let enabledPlatforms = enabledDraftPlatforms(draft);

      return {
        draftId: providerId(draft.id),
        status: draft.status,
        publishState: draft.publish_state,
        createdAt: draft.created_at,
        updatedAt: draft.updated_at,
        scheduledDate: draft.scheduled_date,
        publishedAt: draft.published_at,
        draftTitle: draft.draft_title,
        tags: draft.tags,
        preview: draft.preview,
        enabledPlatforms
      };
    });

    let hasMore = result.next !== null;

    return {
      output: {
        drafts,
        totalCount: result.count,
        limit: result.limit,
        offset: result.offset,
        hasMore
      },
      message: `Found **${result.count}** draft(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}. Showing ${drafts.length} result(s).`
    };
  })
  .build();
