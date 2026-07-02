import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageEvaluator = SlateTool.create(spec, {
  name: 'Manage Evaluator',
  key: 'manage_evaluator',
  description: `Create, update, retrieve, or delete evaluators. Evaluators judge the output of Prompts, Tools, Flows, or other Evaluators. Supports three evaluator types: **Code** (deterministic rules), **AI/LLM** (using foundation models), and **Human** (manual feedback). Returns judgments as booleans, numbers, or selections.`,
  instructions: [
    'For code evaluators, set evaluatorType to "python" and provide sourceCode.',
    'For LLM evaluators, set evaluatorType to "llm" and configure the model and prompt.',
    'For human evaluators, set evaluatorType to "human" and provide instructions.'
  ],
  tags: {
    destructive: false,
    readOnly: false
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listEvaluators({
        page: ctx.input.page,
        size: ctx.input.size
      });
      return {
        output: { evaluators: result.records, total: result.total },
        message: `Found **${result.total}** evaluators.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.evaluatorId) throw new Error('evaluatorId is required for get action');
      let evaluator = await client.getEvaluator(ctx.input.evaluatorId);
      return {
        output: { evaluator },
        message: `Retrieved evaluator **${evaluator.name || evaluator.path}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let spec: Record<string, any> = {};
      if (ctx.input.evaluatorType) spec.evaluator_type = ctx.input.evaluatorType;
      if (ctx.input.argumentsType) spec.arguments_type = ctx.input.argumentsType;
      if (ctx.input.returnType) spec.return_type = ctx.input.returnType;
      if (ctx.input.sourceCode) spec.code = ctx.input.sourceCode;
      if (ctx.input.model) spec.model = ctx.input.model;
      if (ctx.input.prompt) spec.prompt = { template: ctx.input.prompt };
      if (ctx.input.instructions) spec.instructions = ctx.input.instructions;

      let body: Record<string, any> = { spec };
      if (ctx.input.path) body.path = ctx.input.path;
      if (ctx.input.evaluatorId) body.id = ctx.input.evaluatorId;
      if (ctx.input.versionName) body.version_name = ctx.input.versionName;
      if (ctx.input.versionDescription)
        body.version_description = ctx.input.versionDescription;

      let evaluator = await client.upsertEvaluator(body);
      return {
        output: { evaluator },
        message: `Created/updated evaluator **${evaluator.name || evaluator.path}** (type: ${ctx.input.evaluatorType || 'unknown'}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.evaluatorId) throw new Error('evaluatorId is required for update action');
      let body: Record<string, any> = {};
      if (ctx.input.path) body.path = ctx.input.path;
      if (ctx.input.name) body.name = ctx.input.name;
      let evaluator = await client.updateEvaluator(ctx.input.evaluatorId, body);
      return {
        output: { evaluator },
        message: `Updated evaluator **${evaluator.name || evaluator.path}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.evaluatorId) throw new Error('evaluatorId is required for delete action');
      await client.deleteEvaluator(ctx.input.evaluatorId);
      return {
        output: {},
        message: `Deleted evaluator **${ctx.input.evaluatorId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
