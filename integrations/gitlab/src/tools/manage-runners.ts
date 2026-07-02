import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, gitLabServiceError } from '../lib/helpers';
import { spec } from '../spec';

let runnerSchema = z.object({
  runnerId: z.number(),
  description: z.string().optional().nullable(),
  active: z.boolean().optional(),
  paused: z.boolean().optional(),
  isShared: z.boolean().optional(),
  runnerType: z.string().optional(),
  status: z.string().optional(),
  ipAddress: z.string().optional().nullable(),
  tagList: z.array(z.string()).optional(),
  runUntagged: z.boolean().optional(),
  locked: z.boolean().optional(),
  accessLevel: z.string().optional(),
  maximumTimeout: z.number().optional().nullable(),
  online: z.boolean().optional(),
  architecture: z.string().optional().nullable(),
  platform: z.string().optional().nullable(),
  contactedAt: z.string().optional().nullable()
});

export let manageRunners = SlateTool.create(spec, {
  name: 'Manage Runners',
  key: 'manage_runners',
  description: `List, view, update, pause/resume, or delete CI/CD runners. Runners can be listed for a specific project or across all accessible runners. Update runner configuration including tags, description, and access level.`,
  instructions: [
    'Use action "list" to see all runners for a project or globally.',
    'Use action "get" to fetch details of a specific runner.',
    'Use action "update" to modify runner settings (description, tags, paused, etc.).',
    'Use action "delete" to permanently remove a runner.',
    'Use action "jobs" to list jobs processed by a specific runner.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'update', 'delete', 'jobs'])
        .describe('Action to perform'),
      projectId: z
        .string()
        .optional()
        .describe(
          'Project ID for listing project runners. Omit to list all accessible runners.'
        ),
      runnerId: z
        .number()
        .optional()
        .describe('Runner ID (required for get, update, delete, jobs)'),
      type: z
        .enum(['instance_type', 'group_type', 'project_type'])
        .optional()
        .describe('Filter runners by type'),
      status: z
        .enum(['online', 'offline', 'stale', 'never_contacted', 'active', 'paused'])
        .optional()
        .describe('Filter runners by status'),
      paused: z
        .boolean()
        .optional()
        .describe('Set to true to pause, false to resume (for update)'),
      description: z.string().optional().describe('Runner description (for update)'),
      tagList: z.array(z.string()).optional().describe('Runner tags (for update)'),
      runUntagged: z
        .boolean()
        .optional()
        .describe('Whether to run untagged jobs (for update)'),
      locked: z
        .boolean()
        .optional()
        .describe('Whether the runner is locked to current projects (for update)'),
      accessLevel: z
        .enum(['not_protected', 'ref_protected'])
        .optional()
        .describe('Access level (for update)'),
      maximumTimeout: z.number().optional().describe('Maximum timeout in seconds (for update)')
    })
  )
  .output(
    z.object({
      runners: z.array(runnerSchema).optional(),
      runner: runnerSchema.optional(),
      deleted: z.boolean().optional(),
      jobs: z
        .array(
          z.object({
            jobId: z.number(),
            name: z.string().optional(),
            status: z.string(),
            pipelineId: z.number().optional(),
            projectName: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { action, runnerId } = ctx.input;

    let mapRunner = (r: any) => ({
      runnerId: r.id,
      description: r.description,
      active: r.active,
      paused: r.paused,
      isShared: r.is_shared,
      runnerType: r.runner_type,
      status: r.status,
      ipAddress: r.ip_address,
      tagList: r.tag_list,
      runUntagged: r.run_untagged,
      locked: r.locked,
      accessLevel: r.access_level,
      maximumTimeout: r.maximum_timeout,
      online: r.online,
      architecture: r.architecture,
      platform: r.platform,
      contactedAt: r.contacted_at
    });

    if (action === 'list') {
      let result: any[];
      if (ctx.input.projectId) {
        result = (await client.listProjectRunners(ctx.input.projectId, {
          type: ctx.input.type,
          status: ctx.input.status
        })) as any[];
      } else {
        result = (await client.listAllRunners({
          type: ctx.input.type,
          status: ctx.input.status
        })) as any[];
      }
      let runners = result.map(mapRunner);
      return {
        output: { runners },
        message: `Found **${runners.length}** runner(s).`
      };
    }

    if (action === 'get') {
      if (!runnerId) throw gitLabServiceError('runnerId is required for get action');
      let r = await client.getRunner(runnerId);
      return {
        output: { runner: mapRunner(r) },
        message: `Runner **#${runnerId}** — ${(r as any).description || 'no description'} (${(r as any).status}).`
      };
    }

    if (action === 'update') {
      if (!runnerId) throw gitLabServiceError('runnerId is required for update action');
      let data: any = {};
      if (ctx.input.paused !== undefined) data.paused = ctx.input.paused;
      if (ctx.input.description !== undefined) data.description = ctx.input.description;
      if (ctx.input.tagList !== undefined) data.tag_list = ctx.input.tagList;
      if (ctx.input.runUntagged !== undefined) data.run_untagged = ctx.input.runUntagged;
      if (ctx.input.locked !== undefined) data.locked = ctx.input.locked;
      if (ctx.input.accessLevel !== undefined) data.access_level = ctx.input.accessLevel;
      if (ctx.input.maximumTimeout !== undefined)
        data.maximum_timeout = ctx.input.maximumTimeout;
      let r = await client.updateRunner(runnerId, data);
      return {
        output: { runner: mapRunner(r) },
        message: `Updated runner **#${runnerId}**.`
      };
    }

    if (action === 'delete') {
      if (!runnerId) throw gitLabServiceError('runnerId is required for delete action');
      await client.deleteRunner(runnerId);
      return {
        output: { deleted: true },
        message: `Deleted runner **#${runnerId}**.`
      };
    }

    // jobs
    if (!runnerId) throw gitLabServiceError('runnerId is required for jobs action');
    let result = (await client.listRunnerJobs(runnerId, {
      status: ctx.input.status
    })) as any[];
    let jobs = result.map((j: any) => ({
      jobId: j.id,
      name: j.name,
      status: j.status,
      pipelineId: j.pipeline?.id,
      projectName: j.project?.name
    }));
    return {
      output: { jobs },
      message: `Found **${jobs.length}** job(s) for runner **#${runnerId}**.`
    };
  })
  .build();
