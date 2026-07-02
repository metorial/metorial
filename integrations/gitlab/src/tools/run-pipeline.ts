import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, gitLabServiceError, resolveProjectId } from '../lib/helpers';
import { spec } from '../spec';

export let runPipeline = SlateTool.create(spec, {
  name: 'Run Pipeline',
  key: 'run_pipeline',
  description: `Create and run a new pipeline on a specified branch or tag. Optionally pass CI/CD variables for the pipeline run. Can also retry or cancel an existing pipeline.`,
  instructions: [
    'Use action "create" to trigger a new pipeline on a branch/tag.',
    'Use action "retry" to retry all failed jobs in an existing pipeline.',
    'Use action "cancel" to cancel a running pipeline.'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID or URL-encoded path. Falls back to config default.'),
      action: z.enum(['create', 'retry', 'cancel']).describe('The action to perform'),
      ref: z
        .string()
        .optional()
        .describe('Branch or tag name to run the pipeline on (required for "create")'),
      pipelineId: z
        .number()
        .optional()
        .describe('Pipeline ID (required for "retry" and "cancel")'),
      variables: z
        .array(
          z.object({
            key: z.string().describe('Variable key'),
            value: z.string().describe('Variable value'),
            variableType: z.enum(['env_var', 'file']).optional().describe('Variable type')
          })
        )
        .optional()
        .describe('Variables to pass to the new pipeline (only for "create")')
    })
  )
  .output(
    z.object({
      pipelineId: z.number(),
      status: z.string(),
      ref: z.string(),
      sha: z.string(),
      webUrl: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);
    let p: any;

    if (ctx.input.action === 'create') {
      if (!ctx.input.ref) {
        throw gitLabServiceError('ref is required when creating a pipeline');
      }
      let vars = ctx.input.variables?.map(v => ({
        key: v.key,
        value: v.value,
        variable_type: v.variableType
      }));
      p = await client.createPipeline(projectId, ctx.input.ref, vars);
    } else if (ctx.input.action === 'retry') {
      if (!ctx.input.pipelineId) {
        throw gitLabServiceError('pipelineId is required when retrying a pipeline');
      }
      p = await client.retryPipeline(projectId, ctx.input.pipelineId);
    } else {
      if (!ctx.input.pipelineId) {
        throw gitLabServiceError('pipelineId is required when canceling a pipeline');
      }
      p = await client.cancelPipeline(projectId, ctx.input.pipelineId);
    }

    let actionVerb =
      ctx.input.action === 'create'
        ? 'Created'
        : ctx.input.action === 'retry'
          ? 'Retried'
          : 'Canceled';

    return {
      output: {
        pipelineId: p.id,
        status: p.status,
        ref: p.ref,
        sha: p.sha,
        webUrl: p.web_url,
        createdAt: p.created_at
      },
      message: `${actionVerb} pipeline **#${p.id}** on \`${p.ref}\` — status: **${p.status}**.`
    };
  })
  .build();
