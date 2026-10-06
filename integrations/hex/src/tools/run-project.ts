import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runProject = SlateTool.create(spec, {
  name: 'Run Project',
  key: 'run_project',
  tags: { destructive: true },
  description: `Trigger a run of the latest published version of a Hex project. Supports custom input parameters, saved views, cache control, and notifications for run completion (via Slack, users, or groups).`,
  constraints: [
    'Project execution and API rate limits depend on the workspace and plan. Runs can execute SQL/Python and incur compute or warehouse charges.'
  ],
  instructions: [
    'Only the latest published version can run. Request acceptance is not successful completion; use Get Run Status to observe it. Notifications send to the explicitly specified recipients.'
  ]
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
        .describe(
          'Deprecated Hex option: true updates published results and disables SQL cache reuse; false preserves published results and permits cache reuse. Do not combine with the current cache/result options.'
        ),
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
              .describe(
                'SUCCESS, FAILURE or ALL; legacy slack_channel, hex_user and hex_group recipient types are also accepted.'
              ),
            target: z
              .any()
              .describe(
                'For SUCCESS/FAILURE/ALL, an object with explicit userIds, groupIds or slackChannelIds and optional notification options. Legacy recipient types take one ID or an array of IDs.'
              )
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
      status: z.string().optional(),
      projectVersion: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl
    });

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
        runStatusUrl: run.runStatusUrl,
        projectVersion: run.projectVersion
      },
      message: ctx.input.dryRun
        ? `Hex validated the run request for project ${run.projectId} without starting execution.`
        : `Hex accepted run **${run.runId}** for project ${run.projectId}. Use Get Run Status to check completion.`
    };
  })
  .build();
