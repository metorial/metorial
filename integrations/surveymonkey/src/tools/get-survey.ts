import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSurvey = SlateTool.create(spec, {
  name: 'Get Survey',
  key: 'get_survey',
  description: `Retrieve detailed information about a specific survey, including its full structure with pages and questions. Use the **includeDetails** flag to fetch the complete survey design with all question and answer option IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      surveyId: z.string().describe('ID of the survey to retrieve'),
      includeDetails: z
        .boolean()
        .optional()
        .describe(
          'If true, returns full survey details including pages, questions, and answer options'
        )
    })
  )
  .output(
    z.object({
      surveyId: z.string(),
      title: z.string(),
      nickname: z.string().optional(),
      language: z.string().optional(),
      questionCount: z.number().optional(),
      pageCount: z.number().optional(),
      responseCount: z.number().optional(),
      dateCreated: z.string().optional(),
      dateModified: z.string().optional(),
      previewUrl: z.string().optional(),
      editUrl: z.string().optional(),
      collectUrl: z.string().optional(),
      analyzeUrl: z.string().optional(),
      pages: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let survey = ctx.input.includeDetails
      ? await client.getSurveyDetails(ctx.input.surveyId)
      : await client.getSurvey(ctx.input.surveyId);

    return {
      output: {
        surveyId: survey.id,
        title: survey.title,
        nickname: survey.nickname,
        language: survey.language,
        questionCount: survey.question_count,
        pageCount: survey.page_count,
        responseCount: survey.response_count,
        dateCreated: survey.date_created,
        dateModified: survey.date_modified,
        previewUrl: survey.preview,
        editUrl: survey.edit_url,
        collectUrl: survey.collect_url,
        analyzeUrl: survey.analyze_url,
        pages: survey.pages
      },
      message: `Retrieved survey **"${survey.title}"** (${survey.question_count || 0} questions, ${survey.response_count || 0} responses).`
    };
  })
  .build();
