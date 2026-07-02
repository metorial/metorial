import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageQuestionAnswers = SlateTool.create(spec, {
  name: 'Manage Question Answers',
  key: 'manage_question_answers',
  description: `Add or remove predefined answer options for a question. Used with question types that have selectable options (option, checkbox, dropdown).`
})
  .input(
    z.object({
      operation: z
        .enum(['add', 'delete'])
        .describe('Whether to add or delete an answer option'),
      questionId: z
        .string()
        .optional()
        .describe('Question ID to add an answer to (required for "add" operation)'),
      answerText: z
        .string()
        .optional()
        .describe('Answer text to add (required for "add" operation)'),
      answerId: z
        .string()
        .optional()
        .describe('Answer ID to delete (required for "delete" operation)')
    })
  )
  .output(
    z.object({
      answerId: z.string().optional().describe('ID of the created or deleted answer'),
      operation: z.string().describe('Operation performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.operation === 'add') {
      if (!ctx.input.questionId || !ctx.input.answerText) {
        throw new Error('questionId and answerText are required for the "add" operation.');
      }
      let answerId = await client.addAnswer(ctx.input.questionId, ctx.input.answerText);
      return {
        output: { answerId, operation: 'add' },
        message: `Added answer **${ctx.input.answerText}** to question **${ctx.input.questionId}** (answer ID: ${answerId}).`
      };
    } else {
      if (!ctx.input.answerId) {
        throw new Error('answerId is required for the "delete" operation.');
      }
      await client.deleteAnswer(ctx.input.answerId);
      return {
        output: { answerId: ctx.input.answerId, operation: 'delete' },
        message: `Deleted answer **${ctx.input.answerId}**.`
      };
    }
  })
  .build();
