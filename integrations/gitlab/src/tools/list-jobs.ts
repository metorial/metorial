import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, resolveProjectId } from '../lib/helpers';
import { spec } from '../spec';

let jobSchema = z.object({
  jobId: z.number(),
  name: z.string(),
  stage: z.string(),
  status: z.string(),
  ref: z.string().optional(),
  tag: z.boolean().optional(),
  duration: z.number().optional().nullable(),
  queuedDuration: z.number().optional().nullable(),
  startedAt: z.string().optional().nullable(),
  finishedAt: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  webUrl: z.string().optional(),
  pipelineId: z.number().optional(),
  runnerName: z.string().optional().nullable(),
  allowFailure: z.boolean().optional()
});

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List CI/CD jobs for a specific pipeline or across a project. Filter by job scope (status). Returns job name, stage, status, duration, and associated pipeline.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID or URL-encoded path. Falls back to config default.'),
      pipelineId: z
        .number()
        .optional()
        .describe('Pipeline ID to list jobs for. If omitted, lists jobs across the project.'),
      scope: z
        .array(
          z.enum([
            'created',
            'pending',
            'running',
            'failed',
            'success',
            'canceled',
            'skipped',
            'waiting_for_resource',
            'manual'
          ])
        )
        .optional()
        .describe('Filter jobs by status scope'),
      perPage: z.number().optional().describe('Number of results per page (max 100)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      jobs: z.array(jobSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);

    let result: any[];
    if (ctx.input.pipelineId) {
      result = (await client.listPipelineJobs(projectId, ctx.input.pipelineId, {
        scope: ctx.input.scope,
        perPage: ctx.input.perPage,
        page: ctx.input.page
      })) as any[];
    } else {
      result = (await client.listProjectJobs(projectId, {
        scope: ctx.input.scope,
        perPage: ctx.input.perPage,
        page: ctx.input.page
      })) as any[];
    }

    let jobs = result.map((j: any) => ({
      jobId: j.id,
      name: j.name,
      stage: j.stage,
      status: j.status,
      ref: j.ref,
      tag: j.tag,
      duration: j.duration,
      queuedDuration: j.queued_duration,
      startedAt: j.started_at,
      finishedAt: j.finished_at,
      createdAt: j.created_at,
      webUrl: j.web_url,
      pipelineId: j.pipeline?.id,
      runnerName: j.runner?.description,
      allowFailure: j.allow_failure
    }));

    let source = ctx.input.pipelineId
      ? `pipeline **#${ctx.input.pipelineId}**`
      : `project **${projectId}**`;
    return {
      output: { jobs },
      message: `Found **${jobs.length}** job(s) in ${source}.`
    };
  })
  .build();
