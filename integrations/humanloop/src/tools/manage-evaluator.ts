import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectHumanloopOperation } from '../lib/retirement';
import { spec } from '../spec';

export let manageEvaluator = SlateTool.create(spec, {
  name: 'Manage Evaluator',
  key: 'manage_evaluator',
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
      action: z
        .enum(['create', 'update', 'get', 'list', 'delete'])
        .describe('Action to perform'),
      evaluatorId: z
        .string()
        .optional()
        .describe('Evaluator ID (required for get, update, delete)'),
      path: z
        .string()
        .optional()
        .describe('Path for the evaluator (e.g. "folder/my-evaluator"). Used for create.'),
      evaluatorType: z
        .enum(['python', 'llm', 'human', 'external'])
        .optional()
        .describe('Type of evaluator'),
      argumentsType: z
        .enum(['target_free', 'target_required'])
        .optional()
        .describe('Whether the evaluator requires a target'),
      returnType: z
        .enum(['boolean', 'number', 'select', 'multi_select', 'text'])
        .optional()
        .describe('Return type of the evaluator'),
      sourceCode: z.string().optional().describe('Source code for code evaluators (Python)'),
      model: z.string().optional().describe('Model to use for LLM evaluators'),
      prompt: z
        .array(
          z.object({
            role: z.string().describe('Role of the message'),
            content: z.string().describe('Content of the message')
          })
        )
        .optional()
        .describe('Prompt template for LLM evaluators'),
      instructions: z.string().optional().describe('Instructions for human evaluators'),
      versionName: z.string().optional().describe('Name for this version'),
      versionDescription: z.string().optional().describe('Description for this version'),
      name: z.string().optional().describe('New name for the evaluator (for update)'),
      page: z.number().optional().describe('Page number for list action'),
      size: z.number().optional().describe('Page size for list action')
    })
  )
  .output(
    z.object({
      evaluator: z.any().optional().describe('Evaluator details'),
      evaluators: z.array(z.any()).optional().describe('List of evaluators'),
      total: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async () => rejectHumanloopOperation())
  .build();
