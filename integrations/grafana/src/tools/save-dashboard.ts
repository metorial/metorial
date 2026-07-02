import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let saveDashboard = SlateTool.create(spec, {
  name: 'Save Dashboard',
  key: 'save_dashboard',
  description: `Create a new dashboard or update an existing one. Provide the full dashboard model JSON. To update, include the existing dashboard UID and set overwrite to true. To create, omit the UID or set a new one.`,
  instructions: [
    'When updating, first retrieve the dashboard to get its current version, then submit the modified model.',
    'If folderUid is not specified when updating, the dashboard may be moved to the root level.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      dashboard: z
        .any()
        .describe(
          'Full dashboard model JSON object. Must include "title". May include "uid" for updates, "panels", "tags", "schemaVersion", etc.'
        ),
      folderUid: z.string().optional().describe('UID of the folder to save the dashboard in'),
      overwrite: z
        .boolean()
        .optional()
        .describe('Set to true to overwrite an existing dashboard with the same UID'),
      message: z.string().optional().describe('Commit message for version history')
    })
  )
  .output(
    z.object({
      dashboardUid: z.string().describe('UID of the saved dashboard'),
      dashboardId: z.number().describe('Numeric ID of the dashboard'),
      url: z.string().describe('Relative URL to the dashboard'),
      status: z.string().describe('Status of the operation (success)'),
      version: z.number().optional().describe('Version number after save')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createOrUpdateDashboard(ctx.input.dashboard, {
      folderUid: ctx.input.folderUid,
      overwrite: ctx.input.overwrite,
      message: ctx.input.message
    });

    return {
      output: {
        dashboardUid: result.uid,
        dashboardId: result.id,
        url: result.url,
        status: result.status,
        version: result.version
      },
      message: `Dashboard **${ctx.input.dashboard?.title || result.uid}** saved successfully (version ${result.version || 'N/A'}).`
    };
  })
  .build();
