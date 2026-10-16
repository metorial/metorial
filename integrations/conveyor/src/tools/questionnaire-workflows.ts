import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

let responseSchema = z.object({
  result: z
    .unknown()
    .describe('Provider response, including available resource IDs, state and metadata')
});
let pagination = {
  page: z.number().optional().describe('Page number; provider default is 1'),
  perPage: z.number().optional().describe('Results per page; provider default is 100')
};

export let listOneOffQuestions = SlateTool.create(spec, {
  key: 'list_one_off_questions',
  name: 'List One-off Questions',
  description:
    'Retrieve one-off security questions with generated answers, answer metadata, issue state, source and asking user when available.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      createdAtStart: z.string().optional().describe('Created on or after YYYY-MM-DD'),
      createdAtEnd: z.string().optional().describe('Created on or before YYYY-MM-DD'),
      source: z
        .enum(['api', 'slack', 'browser_extension', 'web_app', 'customer_via_trustcenter'])
        .optional()
        .describe('Question source'),
      isTest: z
        .enum(['true', 'false'])
        .optional()
        .describe('Test question filter; tests are excluded by the provider by default'),
      ...pagination
    })
  )
  .output(responseSchema)
  .handleInvocation(async ctx => {
    let result = await new ConveyorClient(ctx.auth).listOneOffQuestions(ctx.input);
    return { output: { result }, message: 'Retrieved one-off questions.' };
  })
  .build();

export let listQuestionnaireQuestions = SlateTool.create(spec, {
  key: 'list_questionnaire_questions',
  name: 'List Questionnaire Questions',
  description:
    'Retrieve questionnaire questions with AI drafts, reviewed answers, grading, cited sources, collaborators and revision history. Filter to a questionnaire ID from list_questionnaires.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      questionnaireId: z
        .string()
        .optional()
        .describe('Questionnaire ID from list_questionnaires'),
      questionnaireType: z
        .enum(['RFP', 'Security Questionnaire', 'Past Answers Import'])
        .optional()
        .describe('Questionnaire type'),
      questionnaireStatus: z
        .string()
        .optional()
        .describe('Parent questionnaire workflow status'),
      createdAtStart: z
        .string()
        .optional()
        .describe('Created on or after this ISO 8601 timestamp'),
      createdAtEnd: z
        .string()
        .optional()
        .describe('Created on or before this ISO 8601 timestamp'),
      isTest: z.enum(['true', 'false']).optional().describe('Filter by test questionnaire'),
      isConveyoraiAnswered: z
        .enum(['true', 'false'])
        .optional()
        .describe('Whether ConveyorAI provided an answer'),
      reusable: z
        .boolean()
        .optional()
        .describe('Whether eligible for the Past Answers Knowledge Base'),
      ...pagination
    })
  )
  .output(responseSchema)
  .handleInvocation(async ctx => {
    let result = await new ConveyorClient(ctx.auth).listQuestionnaireQuestions(ctx.input);
    return { output: { result }, message: 'Retrieved questionnaire questions.' };
  })
  .build();

export let updateQuestionnaire = SlateTool.create(spec, {
  key: 'update_questionnaire',
  name: 'Update Questionnaire',
  description:
    'Approve or complete a questionnaire, update its due date or assignee, or change internal notes. Completing a questionnaire records its completion time and triggers grading.'
})
  .input(
    z.object({
      questionnaireId: z.string().describe('Questionnaire ID from list_questionnaires'),
      status: z.enum(['approved', 'completed']).optional().describe('New workflow status'),
      dueAt: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      assigneeEmail: z.string().optional().describe('Assignee email in your organization'),
      notes: z
        .string()
        .nullable()
        .optional()
        .describe('Internal notes; empty string or null clears notes')
    })
  )
  .output(responseSchema)
  .handleInvocation(async ctx => {
    let { questionnaireId, ...updates } = ctx.input;
    if (!Object.values(updates).some(value => value !== undefined)) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    let result = await new ConveyorClient(ctx.auth).updateQuestionnaire(
      questionnaireId,
      updates
    );
    return { output: { result }, message: 'Updated the questionnaire.' };
  })
  .build();

export let listProjects = SlateTool.create(spec, {
  key: 'list_projects',
  name: 'List Projects',
  description:
    'Discover RFP projects and their identifiers, filtered by status, customer domain or CRM record.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      crmId: z.string().optional().describe('Salesforce record ID'),
      crmLink: z.string().optional().describe('Exact CRM link URL'),
      status: z
        .enum(['draft', 'started', 'completed', 'cancelled', 'archived'])
        .optional()
        .describe('Project status'),
      domain: z.string().optional().describe('Customer domain'),
      ...pagination
    })
  )
  .output(responseSchema)
  .handleInvocation(async ctx => {
    let result = await new ConveyorClient(ctx.auth).listProjects(ctx.input);
    return { output: { result }, message: 'Retrieved RFP projects.' };
  })
  .build();
