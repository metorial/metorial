import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runProject = SlateTool.create(spec, {
  name: 'Run Project',
  key: 'run_project',
  description: `Trigger a run of the latest published version of a Hex project. Supports custom input parameters, saved views, cache control, and notifications for run completion (via Slack, users, or groups).`,
  constraints: ['Rate limited to 20 requests per minute and 60 per hour per project.']
})
  .input(
    z.object({
      projectId: z.string().describe('UUID of the project to run'),
      inputParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom input parameters to pass to the project run'),
      viewId: z.string().optional().describe('Saved view ID to use for the run'),
      dryRun: z
        .boolean()
        .optional()
        .describe('If true, validate the run configuration without executing'),
      updateCache: z
        .boolean()
        .optional()
        .describe('If true, update the cache with the results of this run'),
      updatePublishedResults: z
        .boolean()
        .optional()
        .describe('If true, update the published app with the run output'),
      useCachedSqlResults: z
        .boolean()
        .optional()
        .describe('If true, use cached SQL results where available'),
      notifications: z
        .array(
          z.object({
            type: z
              .string()
              .describe('Notification type (e.g. "slack_channel", "hex_user", "hex_group")'),
            target: z.any().describe('Notification target details')
          })
        )
        .optional()
        .describe('Notifications to send on run completion')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      runId: z.string(),
      runUrl: z.string(),
      runStatusUrl: z.string().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let run = await client.runProject(ctx.input.projectId, {
      inputParams: ctx.input.inputParams,
      viewId: ctx.input.viewId,
      dryRun: ctx.input.dryRun,
      updateCache: ctx.input.updateCache,
      updatePublishedResults: ctx.input.updatePublishedResults,
      useCachedSqlResults: ctx.input.useCachedSqlResults,
      notifications: ctx.input.notifications
    });

    return {
      output: {
        projectId: run.projectId,
        runId: run.runId,
        runUrl: run.runUrl,
        runStatusUrl: (run as any).runStatusUrl,
        status: run.status
      },
      message: `Triggered run **${run.runId}** for project ${run.projectId}.${ctx.input.dryRun ? ' (dry run)' : ''}`
    };
  })
  .build();
