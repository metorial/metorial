import { SlateTool } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let getPipelineRunTool = SlateTool.create(spec, {
  name: 'Get Pipeline Run',
  key: 'get_pipeline_run',
  description: `Get details of a specific pipeline run, or list recent runs for a pipeline. Use to check the status, result, and timeline of a build/pipeline execution.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name or ID. Uses default project from config if not provided.'),
      pipelineId: z.number().describe('Pipeline ID'),
      runId: z
        .number()
        .optional()
        .describe('Specific run ID to get details for. If omitted, lists recent runs.'),
      top: z.number().optional().describe('Max runs to return when listing (default 10)'),
      includeTimeline: z
        .boolean()
        .optional()
        .describe('Include build timeline (stages/jobs/steps) when fetching a specific run')
    })
  )
  .output(
    z.object({
      run: z
        .object({
          runId: z.number(),
          pipelineId: z.number(),
          pipelineName: z.string().optional(),
          state: z.string(),
          result: z.string().optional(),
          createdDate: z.string().optional(),
          finishedDate: z.string().optional(),
          sourceBranch: z.string().optional(),
          sourceVersion: z.string().optional(),
          url: z.string().optional()
        })
        .optional(),
      runs: z
        .array(
          z.object({
            runId: z.number(),
            state: z.string(),
            result: z.string().optional(),
            createdDate: z.string().optional(),
            finishedDate: z.string().optional(),
            sourceBranch: z.string().optional()
          })
        )
        .optional(),
      timeline: z
        .array(
          z.object({
            recordId: z.string().optional(),
            recordType: z.string().optional(),
            name: z.string().optional(),
            state: z.string().optional(),
            result: z.string().optional(),
            startTime: z.string().optional(),
            finishTime: z.string().optional(),
            errorCount: z.number().optional(),
            warningCount: z.number().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AzureDevOpsClient({
      token: ctx.auth.token,
      organization: ctx.config.organization
    });
    let project = ctx.input.project || ctx.config.project;
    if (!project) throw new Error('Project is required.');

    if (ctx.input.runId) {
      let run = await client.getPipelineRun(project, ctx.input.pipelineId, ctx.input.runId);

      let output: Record<string, any> = {
        run: {
          runId: run.id,
          pipelineId: run.pipeline?.id ?? ctx.input.pipelineId,
          pipelineName: run.pipeline?.name,
          state: run.state,
          result: run.result,
          createdDate: run.createdDate,
          finishedDate: run.finishedDate,
          sourceBranch: run.resources?.repositories?.self?.refName,
          sourceVersion: run.resources?.repositories?.self?.version,
          url: run._links?.web?.href || run.url
        }
      };

      if (ctx.input.includeTimeline) {
        let build = await client.getBuild(project, ctx.input.runId);
        let timeline = await client.getBuildTimeline(project, build.id);
        output.timeline = (timeline.records || []).map((r: any) => ({
          recordId: r.id,
          recordType: r.type,
          name: r.name,
          state: r.state,
          result: r.result,
          startTime: r.startTime,
          finishTime: r.finishTime,
          errorCount: r.errorCount,
          warningCount: r.warningCount
        }));
      }

      return {
        output,
        message: `Pipeline run **#${run.id}** — state: ${run.state}, result: ${run.result || 'pending'}`
      };
    }

    let result = await client.listPipelineRuns(
      project,
      ctx.input.pipelineId,
      ctx.input.top || 10
    );
    let runs = (result.value || []).map((r: any) => ({
      runId: r.id,
      state: r.state,
      result: r.result,
      createdDate: r.createdDate,
      finishedDate: r.finishedDate,
      sourceBranch: r.resources?.repositories?.self?.refName
    }));

    return {
      output: { runs },
      message: `Found **${runs.length}** pipeline runs.`
    };
  })
  .build();
