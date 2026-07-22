import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

let dashboardSchema = z.object({
  dashboardId: z.string().describe('Dashboard ID'),
  title: z.string().optional().describe('Dashboard title'),
  description: z.string().optional().describe('Dashboard description'),
  folderId: z.string().optional().describe('Folder ID containing the dashboard'),
  folderName: z.string().optional().describe('Folder name'),
  creatorUserId: z.string().optional().describe('ID of the user who created the dashboard'),
  creatorUserName: z
    .string()
    .optional()
    .describe('Name of the user who created the dashboard'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  hidden: z.boolean().optional().describe('Whether the dashboard is hidden'),
  favorite: z.boolean().optional().describe('Whether the dashboard is favorited'),
  viewCount: z.number().optional().describe('View count'),
  favoriteCount: z.number().optional().describe('Favorite count')
});

export let searchDashboards = SlateTool.create(spec, {
  name: 'Search Dashboards',
  key: 'search_dashboards',
  description: `Search user-defined dashboards by title, description, folder, or creator user ID. String filters are case-insensitive and support % and _ wildcards. Multiple filters use AND unless filterOr is true. Use manage_user to discover a creator's user ID from their name or email. This does not return LookML dashboards.`,
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
      creatorUserId: z
        .string()
        .optional()
        .describe('Filter by the creator user ID; use manage_user search to discover it'),
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
      dashboards: z.array(dashboardSchema).describe('Matching dashboards'),
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
        { reason: 'looker_search_dashboards_pagination_conflict' }
      );
    }

    let results: unknown;
    try {
      results = await client.searchDashboards({
        title: ctx.input.title,
        description: ctx.input.description,
        folder_id: ctx.input.folderId,
        user_id: ctx.input.creatorUserId,
        page: ctx.input.page,
        per_page: ctx.input.perPage,
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        sorts: ctx.input.sorts,
        filter_or: ctx.input.filterOr
      });
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'search dashboards',
        reason: 'looker_search_dashboards_api_error',
        nestedKeys: ['error', 'errors']
      });
    }

    if (!Array.isArray(results)) {
      throw createApiServiceError('Looker returned an invalid dashboard search response.', {
        reason: 'looker_search_dashboards_invalid_response'
      });
    }

    let dashboards = results.map((dashboard: any) => {
      if (dashboard?.id === undefined || dashboard.id === null) {
        throw createApiServiceError('Looker returned a dashboard without an ID.', {
          reason: 'looker_search_dashboards_invalid_response'
        });
      }

      return {
        dashboardId: String(dashboard.id),
        title: dashboard.title,
        description: dashboard.description,
        folderId:
          dashboard.folder_id === undefined || dashboard.folder_id === null
            ? undefined
            : String(dashboard.folder_id),
        folderName: dashboard.folder?.name,
        creatorUserId:
          dashboard.user_id === undefined || dashboard.user_id === null
            ? undefined
            : String(dashboard.user_id),
        creatorUserName: dashboard.user_name ?? undefined,
        createdAt: dashboard.created_at,
        updatedAt: dashboard.updated_at,
        hidden: dashboard.hidden,
        favorite: dashboard.content_favorite_id != null,
        viewCount: dashboard.view_count,
        favoriteCount: dashboard.favorite_count
      };
    });

    return {
      output: { dashboards, count: dashboards.length },
      message: `Found **${dashboards.length}** dashboard(s)${ctx.input.title ? ` matching "${ctx.input.title}"` : ''}.`
    };
  })
  .build();
