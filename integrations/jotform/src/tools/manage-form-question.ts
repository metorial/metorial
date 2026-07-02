import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { jotformServiceError } from '../lib/errors';
import { spec } from '../spec';

let questionIdFrom = (value: any) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return questionIdFrom(value[0]);
  return value.qid || value.id || value.questionId
    ? String(value.qid || value.id || value.questionId)
    : undefined;
};

let questionRecordFrom = (value: any) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  return value === undefined || value === null ? {} : { value };
};

export let manageFormQuestionTool = SlateTool.create(spec, {
  name: 'Manage Form Question',
  key: 'manage_form_question',
  description: `List, retrieve, create, update, or delete questions on a Jotform form. Use this when you need field-level control such as renaming a field, changing dropdown options, or adding a new field.`,
  instructions: [
    'Use action "list" with formId to list all form questions.',
    'Use action "get" with formId and questionId to read one question.',
    'Use action "create" with formId and question to add a question.',
    'Use action "update" with formId, questionId, and question to change question properties.',
    'Use action "delete" with formId and questionId to remove a question.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Question operation to perform'),
      formId: z.string().describe('ID of the form whose questions should be managed'),
      questionId: z.string().optional().describe('Question ID for get, update, or delete'),
      question: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Question properties for create or update. Common properties include type, text, name, order, required, options, and defaultValue.'
        )
    })
  )
  .output(
    z.object({
      questions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Map of question IDs to question definitions for list operations'),
      question: z
        .record(z.string(), z.any())
        .optional()
        .describe('Question returned by get, create, or update operations'),
      questionId: z.string().optional().describe('Question ID affected by the operation'),
      deleted: z.boolean().optional().describe('Whether the question was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    if (ctx.input.action === 'list') {
      let questions = await client.getFormQuestions(ctx.input.formId);
      let count =
        questions && typeof questions === 'object' ? Object.keys(questions).length : 0;

      return {
        output: {
          questions: questions || {}
        },
        message: `Found **${count}** question(s) on form ${ctx.input.formId}.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.questionId) {
        throw jotformServiceError('questionId is required for get action.');
      }

      let question = await client.getFormQuestion(ctx.input.formId, ctx.input.questionId);
      return {
        output: {
          question: questionRecordFrom(question),
          questionId: ctx.input.questionId
        },
        message: `Retrieved question ${ctx.input.questionId} from form ${ctx.input.formId}.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.question || Object.keys(ctx.input.question).length === 0) {
        throw jotformServiceError('question is required for create action.');
      }

      let question = await client.addFormQuestion(ctx.input.formId, ctx.input.question);
      let questionId = questionIdFrom(question);
      return {
        output: {
          question: questionRecordFrom(question),
          questionId
        },
        message: `Created question${questionId ? ` ${questionId}` : ''} on form ${ctx.input.formId}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.questionId) {
        throw jotformServiceError('questionId is required for update action.');
      }
      if (!ctx.input.question || Object.keys(ctx.input.question).length === 0) {
        throw jotformServiceError('question is required for update action.');
      }

      let question = await client.updateFormQuestion(
        ctx.input.formId,
        ctx.input.questionId,
        ctx.input.question
      );

      return {
        output: {
          question: questionRecordFrom(question),
          questionId: ctx.input.questionId
        },
        message: `Updated question ${ctx.input.questionId} on form ${ctx.input.formId}.`
      };
    }

    if (!ctx.input.questionId) {
      throw jotformServiceError('questionId is required for delete action.');
    }

    await client.deleteFormQuestion(ctx.input.formId, ctx.input.questionId);

    return {
      output: {
        questionId: ctx.input.questionId,
        deleted: true
      },
      message: `Deleted question ${ctx.input.questionId} from form ${ctx.input.formId}.`
    };
  })
  .build();
