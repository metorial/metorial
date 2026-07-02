import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

let dashboardSchema = z.object({
  dashboardId: z.string().optional().describe('Dashboard ID'),
  title: z.string().optional().describe('Dashboard title'),
  description: z.string().optional().describe('Dashboard description'),
  folderId: z.string().optional().describe('Folder ID containing the dashboard'),
  folderName: z.string().optional().describe('Folder name'),
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
  description: `Search for dashboards by title, description, or folder. Returns a list of matching dashboards with their metadata. Use this to discover dashboards or find specific ones.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      title: z.string().optional().describe('Title to search for (supports partial match)'),
      description: z.string().optional().describe('Description to search for'),
      folderId: z.string().optional().describe('Filter by folder ID'),
      page: z.number().optional().describe('Page number (1-based)'),
      perPage: z.number().optional().describe('Results per page (default 25)'),
      sorts: z.string().optional().describe('Sort order (e.g., "title asc")')
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

    let results = await client.searchDashboards({
      title: ctx.input.title,
      description: ctx.input.description,
      folder_id: ctx.input.folderId,
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      sorts: ctx.input.sorts
    });

    let dashboards = (results || []).map((d: any) => ({
      dashboardId: String(d.id),
      title: d.title,
      description: d.description,
      folderId: d.folder_id ? String(d.folder_id) : undefined,
      folderName: d.folder?.name,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      hidden: d.hidden,
      favorite: d.favorite,
      viewCount: d.view_count,
      favoriteCount: d.favorite_count
    }));

    return {
      output: { dashboards, count: dashboards.length },
      message: `Found **${dashboards.length}** dashboard(s)${ctx.input.title ? ` matching "${ctx.input.title}"` : ''}.`
    };
  })
  .build();
