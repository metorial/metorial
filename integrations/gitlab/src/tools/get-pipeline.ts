import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, resolveProjectId } from '../lib/helpers';
import { spec } from '../spec';

export let getPipeline = SlateTool.create(spec, {
  name: 'Get Pipeline',
  key: 'get_pipeline',
  description: `Retrieve detailed information about a specific pipeline, including status, duration, coverage, source, and associated user. Also optionally fetches test report summary.`,
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
      pipelineId: z.number().describe('The ID of the pipeline'),
      includeTestReport: z
        .boolean()
        .optional()
        .describe('Whether to include the test report summary')
    })
  )
  .output(
    z.object({
      pipelineId: z.number(),
      iid: z.number().optional(),
      projectId: z.number().optional(),
      status: z.string(),
      source: z.string().optional(),
      ref: z.string(),
      sha: z.string(),
      beforeSha: z.string().optional(),
      tag: z.boolean().optional(),
      yamlErrors: z.string().optional().nullable(),
      webUrl: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      startedAt: z.string().optional().nullable(),
      finishedAt: z.string().optional().nullable(),
      duration: z.number().optional().nullable(),
      queuedDuration: z.number().optional().nullable(),
      coverage: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
      userName: z.string().optional(),
      testReport: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);

    let p = (await client.getPipeline(projectId, ctx.input.pipelineId)) as any;

    let testReport: any;
    if (ctx.input.includeTestReport) {
      try {
        testReport = await client.getPipelineTestReportSummary(
          projectId,
          ctx.input.pipelineId
        );
      } catch {
        ctx.warn('Test report summary not available for this pipeline.');
      }
    }

    return {
      output: {
        pipelineId: p.id,
        iid: p.iid,
        projectId: p.project_id,
        status: p.status,
        source: p.source,
        ref: p.ref,
        sha: p.sha,
        beforeSha: p.before_sha,
        tag: p.tag,
        yamlErrors: p.yaml_errors,
        webUrl: p.web_url,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        startedAt: p.started_at,
        finishedAt: p.finished_at,
        duration: p.duration,
        queuedDuration: p.queued_duration,
        coverage: p.coverage,
        name: p.name,
        userName: p.user?.name || p.user?.username,
        testReport
      },
      message: `Pipeline **#${p.id}** on ref \`${p.ref}\` is **${p.status}**${p.duration ? ` (${p.duration}s)` : ''}.`
    };
  })
  .build();
