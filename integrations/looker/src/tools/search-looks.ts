import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

export let searchLooks = SlateTool.create(spec, {
  name: 'Search Looks',
  key: 'search_looks',
  description: `Search for saved Looks by title, description, or folder. Returns a list of matching Looks with their metadata.`,
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

    let results = await client.searchLooks({
      title: ctx.input.title,
      description: ctx.input.description,
      folder_id: ctx.input.folderId,
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      sorts: ctx.input.sorts
    });

    let looks = (results || []).map((l: any) => ({
      lookId: String(l.id),
      title: l.title,
      description: l.description,
      folderId: l.folder_id ? String(l.folder_id) : undefined,
      folderName: l.folder?.name,
      queryId: l.query_id ? String(l.query_id) : undefined,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
      viewCount: l.view_count,
      favoriteCount: l.favorite_count
    }));

    return {
      output: { looks, count: looks.length },
      message: `Found **${looks.length}** Look(s)${ctx.input.title ? ` matching "${ctx.input.title}"` : ''}.`
    };
  })
  .build();
