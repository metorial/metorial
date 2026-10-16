import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateInteger } from '../lib/client';
import { spec } from '../spec';

export let createDeployment = SlateTool.create(spec, {
  name: 'Create Deployment',
  key: 'create_deployment',
  description: `Trigger a new deployment for a DeployHQ project. Can deploy to a specific server or server group, with options for revision range, config file copying, build commands, and scheduling. Supports both immediate and scheduled deployments.`,
  instructions: [
    'Use mode "queue" for immediate execution or "preview" to see potential changes first.',
    'For scheduled deployments, set the "schedule" field to "future", "daily", "weekly", or "monthly".',
    'Leave startRevision empty to deploy from the beginning of the branch.'
  ]
})
  .input(
    z.object({
      projectPermalink: z
        .string()
        .describe('Project permalink or identifier. Call list_projects to discover projects.'),
      parentIdentifier: z
        .string()
        .describe('Target identifier from list_servers or list_server_groups'),
      startRevision: z
        .string()
        .optional()
        .describe('Starting revision (commit SHA). Leave empty to deploy from beginning.'),
      endRevision: z
        .string()
        .optional()
        .describe(
          'Ending revision (commit SHA). Required unless scheduling with useLatest enabled.'
        ),
      branch: z.string().optional().describe('Branch to deploy from'),
      mode: z
        .enum(['queue', 'preview'])
        .optional()
        .describe('Deployment mode: "queue" for immediate, "preview" to see changes first'),
      copyConfigFiles: z
        .boolean()
        .optional()
        .describe('Whether to copy config files during deployment'),
      runBuildCommands: z
        .boolean()
        .optional()
        .describe('Whether to run build pipeline commands'),
      useBuildCache: z.boolean().optional().describe('Whether to use the build cache'),
      deployEntireRepository: z
        .boolean()
        .optional()
        .describe('Deploy all files from the first to latest commit'),
      configFilesDeployment: z
        .boolean()
        .optional()
        .describe('Set to true for config-file-only deployments'),
      schedule: z
        .enum(['future', 'daily', 'weekly', 'monthly'])
        .optional()
        .describe('Schedule type for scheduled deployments'),
      scheduleHour: z.number().optional().describe('Hour for scheduled deployment (0-23)'),
      scheduleMinute: z.number().optional().describe('Minute for scheduled deployment (0-59)'),
      useLatest: z
        .boolean()
        .optional()
        .describe(
          'For scheduled deployments, select the last deployed and latest repository revisions automatically'
        ),
      scheduleDay: z
        .number()
        .optional()
        .describe('Day of month for monthly or future schedules (1-31)'),
      scheduleMonth: z.number().optional().describe('Month for a future schedule (1-12)'),
      scheduleYear: z.number().optional().describe('Year for a future schedule'),
      scheduleWeekday: z
        .number()
        .optional()
        .describe('Day of week for weekly schedule (0=Sunday, 6=Saturday)')
    })
  )
  .output(
    z.object({
      deploymentIdentifier: z.string().describe('Unique deployment identifier (UUID)'),
      status: z.string().describe('Deployment status'),
      deployer: z.string().optional().describe('Who triggered the deployment'),
      branch: z.string().optional().describe('Deployed branch'),
      startRevision: z.string().optional().describe('Start revision ref'),
      endRevision: z.string().optional().describe('End revision ref'),
      queuedAt: z.string().optional().describe('When the deployment was queued'),
      startedAt: z.string().nullable().optional().describe('When the deployment started'),
      completedAt: z.string().nullable().optional().describe('When the deployment completed'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    for (let [name, value, min, max] of [
      ['scheduleHour', ctx.input.scheduleHour, 0, 23],
      ['scheduleMinute', ctx.input.scheduleMinute, 0, 59],
      ['scheduleWeekday', ctx.input.scheduleWeekday, 0, 6],
      ['scheduleDay', ctx.input.scheduleDay, 1, 31],
      ['scheduleMonth', ctx.input.scheduleMonth, 1, 12],
      ['scheduleYear', ctx.input.scheduleYear, 1, 9999]
    ] as const)
      validateInteger(value, name, min, max);
    if (!ctx.input.endRevision && !(ctx.input.schedule && ctx.input.useLatest)) {
      throw createApiServiceError(
        'Provide endRevision, or enable useLatest for a scheduled deployment.'
      );
    }
    if (ctx.input.useLatest && !ctx.input.schedule) {
      throw createApiServiceError('useLatest is supported only for scheduled deployments.');
    }

    let deploymentData: Record<string, any> = {
      parent_identifier: ctx.input.parentIdentifier,
      start_revision: ctx.input.startRevision ?? '',
      ...(ctx.input.useLatest ? { use_latest: '1' } : {})
    };

    if (ctx.input.startRevision !== undefined)
      deploymentData.start_revision = ctx.input.startRevision;
    if (ctx.input.endRevision !== undefined)
      deploymentData.end_revision = ctx.input.endRevision;
    if (ctx.input.branch !== undefined) deploymentData.branch = ctx.input.branch;
    if (ctx.input.mode !== undefined) deploymentData.mode = ctx.input.mode;
    if (ctx.input.copyConfigFiles !== undefined)
      deploymentData.copy_config_files = ctx.input.copyConfigFiles;
    if (ctx.input.runBuildCommands !== undefined)
      deploymentData.run_build_commands = ctx.input.runBuildCommands;
    if (ctx.input.useBuildCache !== undefined)
      deploymentData.use_build_cache = ctx.input.useBuildCache;
    if (ctx.input.deployEntireRepository !== undefined)
      deploymentData.deploy_entire_repository = ctx.input.deployEntireRepository;
    if (ctx.input.configFilesDeployment !== undefined)
      deploymentData.config_files_deployment = ctx.input.configFilesDeployment;
    let schedule: Record<string, unknown> | undefined;
    if (ctx.input.schedule !== undefined) {
      if (ctx.input.scheduleHour === undefined || ctx.input.scheduleMinute === undefined) {
        throw createApiServiceError(
          'Provide scheduleHour and scheduleMinute for scheduled deployments.'
        );
      }
      let timing: Record<string, unknown> = {
        hour: ctx.input.scheduleHour,
        minute: ctx.input.scheduleMinute
      };
      if (ctx.input.schedule === 'weekly') {
        if (ctx.input.scheduleWeekday === undefined)
          throw createApiServiceError('Provide scheduleWeekday for a weekly deployment.');
        timing.weekday = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday'
        ][ctx.input.scheduleWeekday];
      }
      if (ctx.input.schedule === 'monthly' || ctx.input.schedule === 'future') {
        if (ctx.input.scheduleDay === undefined)
          throw createApiServiceError(
            'Provide scheduleDay for a monthly or future deployment.'
          );
        timing.day = ctx.input.scheduleDay;
      }
      if (ctx.input.schedule === 'future') {
        if (ctx.input.scheduleMonth === undefined || ctx.input.scheduleYear === undefined)
          throw createApiServiceError(
            'Provide scheduleMonth and scheduleYear for a future deployment.'
          );
        let date = new Date(0);
        date.setUTCFullYear(
          ctx.input.scheduleYear,
          ctx.input.scheduleMonth - 1,
          ctx.input.scheduleDay
        );
        if (date.getUTCMonth() !== ctx.input.scheduleMonth - 1)
          throw createApiServiceError('The future deployment date is invalid.');
        timing.month = ctx.input.scheduleMonth;
        timing.year = ctx.input.scheduleYear;
      }
      schedule = { frequency: ctx.input.schedule, [ctx.input.schedule]: timing };
    }

    let d = await client.createDeployment(
      ctx.input.projectPermalink,
      deploymentData,
      schedule
    );

    return {
      output: {
        deploymentIdentifier: d.identifier,
        status: d.status,
        deployer: typeof d.deployer === 'string' ? d.deployer : undefined,
        branch: d.branch,
        startRevision: d.start_revision?.ref,
        endRevision: d.end_revision?.ref,
        queuedAt: d.timestamps?.queued_at ?? d.queued_at,
        startedAt:
          d.timestamps?.started_at !== undefined ? d.timestamps.started_at : d.started_at,
        completedAt:
          d.timestamps?.completed_at !== undefined
            ? d.timestamps.completed_at
            : d.completed_at,
        raw: d
      },
      message: `Deployment \`${d.identifier}\` created with status **${d.status}**.`
    };
  })
  .build();
