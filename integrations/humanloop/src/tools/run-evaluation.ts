import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectHumanloopOperation } from '../lib/retirement';
import { spec } from '../spec';

export let runEvaluation = SlateTool.create(spec, {
  name: 'Run Evaluation',
  key: 'run_evaluation',
  description:
    'DEPRECATED — Humanloop shut down on September 8, 2025. This operation is unavailable; the tool is retained only for compatibility.',
  instructions: [
    'Humanloop is retired. Do not use this tool for new workflows; use data exported before September 8, 2025 with your chosen replacement platform.'
  ],
  tags: {
    destructive: false,
    readOnly: false,
    deprecated: true
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
  .handleInvocation(async () => rejectHumanloopOperation())
  .build();
