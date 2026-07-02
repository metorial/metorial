import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageServiceQuestions = SlateTool.create(spec, {
  name: 'Manage Service Questions',
  key: 'manage_service_questions',
  description: `Attach or remove data collection questions from a scanning service. Questions are prompts presented to app users during scanning.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      questionId: z
        .string()
        .describe(
          'ID of the question. Use comma-separated IDs for multiple, or "all" for all questions.'
        ),
      operation: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove the question from the service'),
      condition: z
        .enum(['shared_submit', 'pre_submit', 'post_submit', 'valid_scan', 'invalid_scan'])
        .optional()
        .describe('When to show the question (only for "add" operation)'),
      required: z
        .boolean()
        .optional()
        .describe('Whether the question is required (only for "add" operation)')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('ID of the affected service'),
      questionId: z.string().describe('ID of the affected question(s)'),
      operation: z.string().describe('Operation performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.operation === 'add') {
      await client.addQuestionToService(
        ctx.input.serviceId,
        ctx.input.questionId,
        ctx.input.condition,
        ctx.input.required
      );
    } else {
      await client.removeQuestionFromService(ctx.input.serviceId, ctx.input.questionId);
    }

    return {
      output: {
        serviceId: ctx.input.serviceId,
        questionId: ctx.input.questionId,
        operation: ctx.input.operation
      },
      message: `${ctx.input.operation === 'add' ? 'Added' : 'Removed'} question **${ctx.input.questionId}** ${ctx.input.operation === 'add' ? 'to' : 'from'} service **${ctx.input.serviceId}**.`
    };
  })
  .build();
