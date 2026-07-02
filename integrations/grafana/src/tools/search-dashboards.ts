import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let searchDashboards = SlateTool.create(spec, {
  name: 'Search Dashboards',
  key: 'search_dashboards',
  description: `Search and list dashboards in Grafana. Supports filtering by query string, tags, folder, and starred status. Returns matching dashboards with their UIDs, titles, URLs, types, and tags.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query string to filter dashboards by title'),
      tags: z.array(z.string()).optional().describe('Filter dashboards by tags'),
      folderUIDs: z.array(z.string()).optional().describe('Filter dashboards by folder UIDs'),
      starred: z.boolean().optional().describe('Filter by starred dashboards only'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      dashboards: z.array(
        z.object({
          dashboardUid: z.string().describe('Unique identifier of the dashboard'),
          title: z.string().describe('Dashboard title'),
          uri: z.string().optional().describe('Dashboard URI path'),
          url: z.string().optional().describe('Dashboard URL'),
          type: z.string().optional().describe('Type of result (dash-db or dash-folder)'),
          tags: z.array(z.string()).optional().describe('Tags assigned to the dashboard'),
          isStarred: z.boolean().optional().describe('Whether the dashboard is starred'),
          folderUid: z
            .string()
            .optional()
            .describe('UID of the folder containing the dashboard'),
          folderTitle: z
            .string()
            .optional()
            .describe('Title of the folder containing the dashboard')
        })
      ),
      totalCount: z.number().describe('Total number of matching results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let results = await client.searchDashboards({
      query: ctx.input.query,
      tag: ctx.input.tags,
      type: 'dash-db',
      folderUIDs: ctx.input.folderUIDs,
      starred: ctx.input.starred,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let dashboards = results.map((d: any) => ({
      dashboardUid: d.uid,
      title: d.title,
      uri: d.uri,
      url: d.url,
      type: d.type,
      tags: d.tags,
      isStarred: d.isStarred,
      folderUid: d.folderUid,
      folderTitle: d.folderTitle
    }));

    return {
      output: {
        dashboards,
        totalCount: dashboards.length
      },
      message: `Found **${dashboards.length}** dashboard(s)${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
