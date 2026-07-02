import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runEvaluation = SlateTool.create(spec, {
  name: 'Run Evaluation',
  key: 'run_evaluation',
  description: `Create and run evaluations, or retrieve evaluation results. Evaluations benchmark different prompt/tool/flow versions against a dataset using specified evaluators. Use this to list evaluations for a file, get evaluation details, or kick off a new evaluation run.`,
  instructions: [
    'To create an evaluation, provide the fileId of the prompt/tool/flow and the evaluator version IDs.',
    'Use the "list" action with a fileId to see past evaluations.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list']).describe('Action to perform'),
      evaluationId: z.string().optional().describe('Evaluation ID (required for get)'),
      fileId: z
        .string()
        .optional()
        .describe(
          'File ID of the prompt/tool/flow to evaluate (required for create and list)'
        ),
      evaluatorVersionIds: z
        .array(z.string())
        .optional()
        .describe('List of evaluator version IDs to use for the evaluation'),
      evaluationName: z.string().optional().describe('Name for the evaluation run'),
      page: z.number().optional().describe('Page number for list action'),
      size: z.number().optional().describe('Page size for list action')
    })
  )
  .output(
    z.object({
      evaluation: z.any().optional().describe('Evaluation details'),
      evaluations: z.array(z.any()).optional().describe('List of evaluations'),
      total: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      if (!ctx.input.fileId) throw new Error('fileId is required for list action');
      let result = await client.listEvaluations(ctx.input.fileId, {
        page: ctx.input.page,
        size: ctx.input.size
      });
      return {
        output: { evaluations: result.records, total: result.total },
        message: `Found **${result.total}** evaluations for file **${ctx.input.fileId}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.evaluationId) throw new Error('evaluationId is required for get action');
      let evaluation = await client.getEvaluation(ctx.input.evaluationId);
      return {
        output: { evaluation },
        message: `Retrieved evaluation **${evaluation.name || ctx.input.evaluationId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.fileId) throw new Error('fileId is required for create action');
      if (!ctx.input.evaluatorVersionIds?.length)
        throw new Error('evaluatorVersionIds is required for create action');

      let body: Record<string, any> = {
        file: { id: ctx.input.fileId },
        evaluators: ctx.input.evaluatorVersionIds.map(versionId => ({
          version_id: versionId,
          orchestrated: true
        }))
      };
      if (ctx.input.evaluationName) body.name = ctx.input.evaluationName;

      let evaluation = await client.createEvaluation(body);
      return {
        output: { evaluation },
        message: `Created evaluation **${evaluation.name || evaluation.id}** with ${ctx.input.evaluatorVersionIds.length} evaluator(s).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
