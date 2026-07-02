import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

let tileSchema = z.object({
  tileId: z.string().describe('Unique identifier of the tile'),
  title: z.string().optional().describe('Display title of the tile'),
  reportId: z.string().optional().describe('Associated report ID'),
  datasetId: z.string().optional().describe('Associated dataset ID'),
  embedUrl: z.string().optional().describe('Embed URL for the tile')
});

let dashboardSchema = z.object({
  dashboardId: z.string().describe('Unique identifier of the dashboard'),
  displayName: z.string().describe('Display name of the dashboard'),
  isReadOnly: z.boolean().optional().describe('Whether the dashboard is read-only'),
  embedUrl: z.string().optional().describe('Embed URL for the dashboard'),
  webUrl: z.string().optional().describe('Web URL for viewing the dashboard'),
  tiles: z.array(tileSchema).optional().describe('Dashboard tiles')
});

export let listDashboards = SlateTool.create(spec, {
  name: 'List Dashboards',
  key: 'list_dashboards',
  description: `List Power BI dashboards and optionally include tile details. Retrieve dashboard names, IDs, embed URLs, and the tiles they contain.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID to filter dashboards. If omitted, lists dashboards from "My Workspace".'
        ),
      includeTiles: z.boolean().optional().describe('Include tile details for each dashboard')
    })
  )
  .output(
    z.object({
      dashboards: z.array(dashboardSchema).describe('List of dashboards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let dashboards = await client.listDashboards(ctx.input.workspaceId);

    let mapped = await Promise.all(
      dashboards.map(async (d: any) => {
        let dashboard: any = {
          dashboardId: d.id,
          displayName: d.displayName,
          isReadOnly: d.isReadOnly,
          embedUrl: d.embedUrl,
          webUrl: d.webUrl
        };

        if (ctx.input.includeTiles) {
          try {
            let tiles = await client.getDashboardTiles(d.id, ctx.input.workspaceId);
            dashboard.tiles = tiles.map((t: any) => ({
              tileId: t.id,
              title: t.title,
              reportId: t.reportId,
              datasetId: t.datasetId,
              embedUrl: t.embedUrl
            }));
          } catch {
            dashboard.tiles = [];
          }
        }

        return dashboard;
      })
    );

    return {
      output: { dashboards: mapped },
      message: `Found **${mapped.length}** dashboard(s).`
    };
  })
  .build();
