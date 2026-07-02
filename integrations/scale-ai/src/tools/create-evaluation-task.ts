import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEvaluationTask = SlateTool.create(spec, {
  name: 'Create Evaluation Task',
  key: 'create_evaluation_task',
  description: `Create an evaluation task in Scale AI — a task with known answers used to measure annotator quality internally. Requires an expected response and optionally an initial response for review-phase evaluations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskType: z
        .string()
        .describe('Type of evaluation task (e.g., imageannotation, textcollection)'),
      project: z.string().describe('Project name'),
      expectedResponse: z
        .any()
        .describe('The known-correct response for evaluating annotator quality'),
      initialResponse: z
        .any()
        .optional()
        .describe('Initial response for review-phase evaluations'),
      taskParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Type-specific task parameters (e.g., attachment, geometries, fields)')
    })
  )
  .output(
    z
      .object({
        taskId: z.string().describe('ID of the created evaluation task'),
        status: z.string().optional().describe('Status of the task')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      project: ctx.input.project,
      expected_response: ctx.input.expectedResponse
    };
    if (ctx.input.initialResponse !== undefined) {
      body.initial_response = ctx.input.initialResponse;
    }
    if (ctx.input.taskParams) {
      Object.assign(body, ctx.input.taskParams);
    }

    let result = await client.createEvaluationTask(ctx.input.taskType, body);

    return {
      output: {
        taskId: result.task_id,
        status: result.status,
        ...result
      },
      message: `Created evaluation task **${result.task_id}** of type \`${ctx.input.taskType}\`.`
    };
  })
  .build();
