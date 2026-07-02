import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let getDashboard = SlateTool.create(spec, {
  name: 'Get Dashboard',
  key: 'get_dashboard',
  description: `Retrieve a dashboard by its UID, including the full dashboard model, metadata, folder information, and version history details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dashboardUid: z.string().describe('UID of the dashboard to retrieve')
    })
  )
  .output(
    z.object({
      dashboardUid: z.string().describe('UID of the dashboard'),
      title: z.string().describe('Dashboard title'),
      version: z.number().optional().describe('Current version number'),
      folderUid: z.string().optional().describe('UID of the parent folder'),
      folderTitle: z.string().optional().describe('Title of the parent folder'),
      url: z.string().optional().describe('Relative URL to the dashboard'),
      tags: z.array(z.string()).optional().describe('Dashboard tags'),
      panels: z.array(z.any()).optional().describe('Dashboard panels configuration'),
      schemaVersion: z.number().optional().describe('Dashboard schema version'),
      createdBy: z.string().optional().describe('User who created the dashboard'),
      updatedBy: z.string().optional().describe('User who last updated the dashboard'),
      created: z.string().optional().describe('Creation timestamp'),
      updated: z.string().optional().describe('Last update timestamp'),
      dashboard: z.any().describe('Full dashboard model JSON')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.getDashboard(ctx.input.dashboardUid);
    let dash = result.dashboard || {};
    let meta = result.meta || {};

    return {
      output: {
        dashboardUid: dash.uid || ctx.input.dashboardUid,
        title: dash.title || '',
        version: dash.version,
        folderUid: meta.folderUid,
        folderTitle: meta.folderTitle,
        url: meta.url,
        tags: dash.tags,
        panels: dash.panels,
        schemaVersion: dash.schemaVersion,
        createdBy: meta.createdBy,
        updatedBy: meta.updatedBy,
        created: meta.created,
        updated: meta.updated,
        dashboard: dash
      },
      message: `Retrieved dashboard **${dash.title || ctx.input.dashboardUid}** (version ${dash.version || 'unknown'}).`
    };
  })
  .build();
