import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      projectPermalink: z.string().describe('The permalink (slug) of the project'),
      parentIdentifier: z.string().describe('UUID of the target server or server group'),
      startRevision: z
        .string()
        .optional()
        .describe('Starting revision (commit SHA). Leave empty to deploy from beginning.'),
      endRevision: z
        .string()
        .optional()
        .describe('Ending revision (commit SHA). Defaults to latest.'),
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
      completedAt: z.string().nullable().optional().describe('When the deployment completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let deploymentData: Record<string, any> = {
      parent_identifier: ctx.input.parentIdentifier
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
    if (ctx.input.schedule !== undefined) {
      deploymentData.at = ctx.input.schedule;
      if (ctx.input.scheduleHour !== undefined) deploymentData.hour = ctx.input.scheduleHour;
      if (ctx.input.scheduleMinute !== undefined)
        deploymentData.minute = ctx.input.scheduleMinute;
      if (ctx.input.scheduleWeekday !== undefined)
        deploymentData.weekday = ctx.input.scheduleWeekday;
    }

    let d = await client.createDeployment(ctx.input.projectPermalink, deploymentData);

    return {
      output: {
        deploymentIdentifier: d.identifier,
        status: d.status,
        deployer: d.deployer,
        branch: d.branch,
        startRevision: d.start_revision?.ref,
        endRevision: d.end_revision?.ref,
        queuedAt: d.queued_at,
        startedAt: d.started_at ?? null,
        completedAt: d.completed_at ?? null
      },
      message: `Deployment \`${d.identifier}\` created with status **${d.status}**.`
    };
  })
  .build();
