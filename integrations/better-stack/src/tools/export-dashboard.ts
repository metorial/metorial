import { SlateTool } from 'slates';
import { z } from 'zod';
import { pathId } from '../lib/api';
import { TelemetryClient } from '../lib/telemetry-client';
import { spec } from '../spec';

export const exportDashboard = SlateTool.create(spec, {
  name: 'Export Dashboard',
  key: 'export_dashboard',
  description:
    'Export a telemetry dashboard as a downloadable JSON configuration, including charts and sections, for backup or import into another team.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      dashboardId: z.string().describe('Dashboard ID; use list_dashboards to discover it')
    })
  )
  .output(
    z.object({
      dashboardId: z.string().describe('Exported dashboard ID'),
      name: z.string().nullable().describe('Dashboard name'),
      fileName: z.string().describe('JSON filename'),
      mimeType: z.string().describe('File MIME type')
    })
  )
  .handleInvocation(async ctx => {
    const client = new TelemetryClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });
    const { data } = await client.getDashboard(ctx.input.dashboardId);
    const dashboardId = String(data.id);
    const fileName = `dashboard-${dashboardId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    await ctx.addAttachment({
      type: 'url',
      url: `${client.baseUrl}/v2/dashboards/${pathId(dashboardId)}/export`,
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      mimeType: 'application/json',
      filename: fileName
    });
    return {
      output: {
        dashboardId,
        name: data.attributes.name ?? null,
        fileName,
        mimeType: 'application/json'
      },
      message: `Prepared **${data.attributes.name || dashboardId}** as a downloadable JSON configuration.`
    };
  })
  .build();
