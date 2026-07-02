import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let surveyOutput = z.object({
  surveyId: z.string().describe('Survey ID'),
  name: z.string().describe('Survey name'),
  description: z.string().optional().describe('Survey description'),
  surveyType: z.string().optional().describe('Type of survey (e.g. "popover")'),
  startDate: z.string().optional().describe('Start date'),
  endDate: z.string().optional().describe('End date'),
  archived: z.boolean().optional().describe('Whether the survey is archived'),
  questions: z
    .array(z.record(z.string(), z.any()))
    .optional()
    .describe('Survey questions configuration'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let listSurveysTool = SlateTool.create(spec, {
  name: 'List Surveys',
  key: 'list_surveys',
  description: `List all surveys in the project with their configuration, questions, and status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      surveys: z.array(surveyOutput),
      hasMore: z.boolean().describe('Whether there are more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listSurveys({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let surveys = (data.results || []).map((s: any) => ({
      surveyId: String(s.id),
      name: s.name,
      description: s.description,
      surveyType: s.type,
      startDate: s.start_date,
      endDate: s.end_date,
      archived: s.archived,
      questions: s.questions,
      createdAt: s.created_at
    }));

    return {
      output: { surveys, hasMore: !!data.next },
      message: `Found **${surveys.length}** survey(s).`
    };
  })
  .build();

export let getSurveyTool = SlateTool.create(spec, {
  name: 'Get Survey',
  key: 'get_survey',
  description: `Retrieve detailed information about a specific survey by its ID, including questions, targeting, and status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      surveyId: z.string().describe('Survey ID')
    })
  )
  .output(surveyOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let s = await client.getSurvey(ctx.input.surveyId);

    return {
      output: {
        surveyId: String(s.id),
        name: s.name,
        description: s.description,
        surveyType: s.type,
        startDate: s.start_date,
        endDate: s.end_date,
        archived: s.archived,
        questions: s.questions,
        createdAt: s.created_at
      },
      message: `Retrieved survey **${s.name}**.`
    };
  })
  .build();

export let createSurveyTool = SlateTool.create(spec, {
  name: 'Create Survey',
  key: 'create_survey',
  description: `Create a new survey with questions and optional targeting. Surveys can be of various types (e.g. popover) and can be linked to feature flags.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Survey name'),
      description: z.string().optional().describe('Survey description'),
      surveyType: z.string().optional().describe('Type of survey (e.g. "popover")'),
      questions: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of question configuration objects'),
      linkedFlagId: z.number().optional().describe('Feature flag ID for targeting conditions'),
      targetingFlagFilters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Targeting flag filter configuration'),
      startDate: z.string().optional().describe('ISO 8601 start date'),
      endDate: z.string().optional().describe('ISO 8601 end date')
    })
  )
  .output(surveyOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.description !== undefined) payload.description = ctx.input.description;
    if (ctx.input.surveyType !== undefined) payload.type = ctx.input.surveyType;
    if (ctx.input.questions !== undefined) payload.questions = ctx.input.questions;
    if (ctx.input.linkedFlagId !== undefined) payload.linked_flag_id = ctx.input.linkedFlagId;
    if (ctx.input.targetingFlagFilters !== undefined)
      payload.targeting_flag_filters = ctx.input.targetingFlagFilters;
    if (ctx.input.startDate !== undefined) payload.start_date = ctx.input.startDate;
    if (ctx.input.endDate !== undefined) payload.end_date = ctx.input.endDate;

    let s = await client.createSurvey(payload);

    return {
      output: {
        surveyId: String(s.id),
        name: s.name,
        description: s.description,
        surveyType: s.type,
        startDate: s.start_date,
        endDate: s.end_date,
        archived: s.archived,
        questions: s.questions,
        createdAt: s.created_at
      },
      message: `Created survey **${s.name}** (ID: ${s.id}).`
    };
  })
  .build();

export let updateSurveyTool = SlateTool.create(spec, {
  name: 'Update Survey',
  key: 'update_survey',
  description: `Update an existing survey's name, description, questions, targeting, or dates. Only provided fields will be updated.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      surveyId: z.string().describe('Survey ID to update'),
      name: z.string().optional().describe('New survey name'),
      description: z.string().optional().describe('New description'),
      questions: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Updated questions'),
      startDate: z.string().optional().describe('New ISO 8601 start date'),
      endDate: z.string().optional().describe('New ISO 8601 end date'),
      archived: z.boolean().optional().describe('Archive or unarchive the survey')
    })
  )
  .output(surveyOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = {};
    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.description !== undefined) payload.description = ctx.input.description;
    if (ctx.input.questions !== undefined) payload.questions = ctx.input.questions;
    if (ctx.input.startDate !== undefined) payload.start_date = ctx.input.startDate;
    if (ctx.input.endDate !== undefined) payload.end_date = ctx.input.endDate;
    if (ctx.input.archived !== undefined) payload.archived = ctx.input.archived;

    let s = await client.updateSurvey(ctx.input.surveyId, payload);

    return {
      output: {
        surveyId: String(s.id),
        name: s.name,
        description: s.description,
        surveyType: s.type,
        startDate: s.start_date,
        endDate: s.end_date,
        archived: s.archived,
        questions: s.questions,
        createdAt: s.created_at
      },
      message: `Updated survey **${s.name}**.`
    };
  })
  .build();

export let deleteSurveyTool = SlateTool.create(spec, {
  name: 'Delete Survey',
  key: 'delete_survey',
  description: `Permanently delete a survey.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      surveyId: z.string().describe('Survey ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the survey was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteSurvey(ctx.input.surveyId);

    return {
      output: { deleted: true },
      message: `Deleted survey **${ctx.input.surveyId}**.`
    };
  })
  .build();
