import { SlateTool } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let runPipelineTool = SlateTool.create(spec, {
  name: 'Run Pipeline',
  key: 'run_pipeline',
  description: `Trigger a pipeline run. Optionally specify a branch, variables, and template parameters. Returns the run ID and status for monitoring.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name or ID. Uses default project from config if not provided.'),
      pipelineId: z.number().describe('ID of the pipeline to run'),
      branch: z
        .string()
        .optional()
        .describe(
          'Branch to run the pipeline on (e.g. "main" or "refs/heads/feature-branch")'
        ),
      variables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Pipeline variables as key-value pairs'),
      templateParameters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Template parameters as key-value pairs')
    })
  )
  .output(
    z.object({
      runId: z.number(),
      pipelineId: z.number(),
      pipelineName: z.string().optional(),
      state: z.string(),
      result: z.string().optional(),
      createdDate: z.string().optional(),
      url: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AzureDevOpsClient({
      token: ctx.auth.token,
      organization: ctx.config.organization
    });
    let project = ctx.input.project || ctx.config.project;
    if (!project) throw new Error('Project is required.');

    let variables: Record<string, { value: string; isSecret?: boolean }> | undefined;
    if (ctx.input.variables) {
      variables = {};
      let entries = ctx.input.variables as Record<string, string>;
      for (let key of Object.keys(entries)) {
        variables[key] = { value: entries[key] as string };
      }
    }

    let templateParams = ctx.input.templateParameters
      ? (ctx.input.templateParameters as Record<string, string>)
      : undefined;

    let run = await client.runPipeline(project, ctx.input.pipelineId, {
      branch: ctx.input.branch,
      variables,
      templateParameters: templateParams
    });

    return {
      output: {
        runId: run.id,
        pipelineId: run.pipeline?.id ?? ctx.input.pipelineId,
        pipelineName: run.pipeline?.name,
        state: run.state,
        result: run.result,
        createdDate: run.createdDate,
        url: run._links?.web?.href || run.url
      },
      message: `Triggered pipeline run **#${run.id}** — state: ${run.state}${ctx.input.branch ? ` on branch "${ctx.input.branch}"` : ''}`
    };
  })
  .build();
