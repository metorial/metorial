import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

export let searchLooks = SlateTool.create(spec, {
  name: 'Search Looks',
  key: 'search_looks',
  description: `Search for saved Looks by title, description, or folder. String filters are case-insensitive and support % and _ wildcards. Multiple filters use AND unless filterOr is true.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      title: z
        .string()
        .optional()
        .describe('Case-insensitive title filter; use % or _ for wildcard matching'),
      description: z
        .string()
        .optional()
        .describe('Case-insensitive description filter; use % or _ for wildcard matching'),
      folderId: z.string().optional().describe('Filter by folder ID'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Deprecated page number; use limit and offset instead'),
      perPage: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Deprecated page size; use limit and offset instead'),
      limit: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Maximum number of results to return'),
      offset: z.number().int().min(0).optional().describe('Number of results to skip'),
      sorts: z.string().optional().describe('One or more sort fields (e.g., "title asc")'),
      filterOr: z
        .boolean()
        .optional()
        .describe('Combine multiple search filters with OR instead of the default AND')
    })
  )
  .output(
    z.object({
      looks: z
        .array(
          z.object({
            lookId: z.string().describe('Look ID'),
            title: z.string().optional().describe('Look title'),
            description: z.string().optional().describe('Look description'),
            folderId: z.string().optional().describe('Folder ID'),
            folderName: z.string().optional().describe('Folder name'),
            queryId: z.string().optional().describe('Associated query ID'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp'),
            viewCount: z.number().optional().describe('View count'),
            favoriteCount: z.number().optional().describe('Favorite count')
          })
        )
        .describe('Matching Looks'),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let usesLegacyPagination = ctx.input.page !== undefined || ctx.input.perPage !== undefined;
    let usesCurrentPagination =
      ctx.input.limit !== undefined || ctx.input.offset !== undefined;
    if (usesLegacyPagination && usesCurrentPagination) {
      throw createApiServiceError(
        'Use either limit and offset or the deprecated page and perPage fields, not both.',
        { reason: 'looker_search_looks_pagination_conflict' }
      );
    }

    let results: unknown = await client.searchLooks({
      title: ctx.input.title,
      description: ctx.input.description,
      folder_id: ctx.input.folderId,
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sorts: ctx.input.sorts,
      filter_or: ctx.input.filterOr
    });

    if (!Array.isArray(results)) {
      throw createApiServiceError('Looker returned an invalid Look search response.', {
        reason: 'looker_search_looks_invalid_response'
      });
    }

    let looks = results.map((look: any) => {
      if (look?.id === undefined || look.id === null) {
        throw createApiServiceError('Looker returned a Look without an ID.', {
          reason: 'looker_search_looks_invalid_response'
        });
      }

      return {
        lookId: String(look.id),
        title: look.title ?? undefined,
        description: look.description ?? undefined,
        folderId:
          look.folder_id === undefined || look.folder_id === null
            ? undefined
            : String(look.folder_id),
        folderName: look.folder?.name ?? undefined,
        queryId:
          look.query_id === undefined || look.query_id === null
            ? undefined
            : String(look.query_id),
        createdAt: look.created_at ?? undefined,
        updatedAt: look.updated_at ?? undefined,
        viewCount: look.view_count ?? undefined,
        favoriteCount: look.favorite_count ?? undefined
      };
    });

    return {
      output: { looks, count: looks.length },
      message: `Found **${looks.length}** Look(s)${ctx.input.title ? ` matching "${ctx.input.title}"` : ''}.`
    };
  })
  .build();
