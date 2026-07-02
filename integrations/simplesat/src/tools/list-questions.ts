import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listQuestions = SlateTool.create(spec, {
  name: 'List Questions',
  key: 'list_questions',
  description: `Retrieve survey questions from your Simplesat account. Can be filtered by survey ID. Returns question text, type, choices, ordering, and associated rules.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      surveyId: z.number().optional().describe('Filter questions by survey ID'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of questions'),
      questions: z.array(
        z.object({
          questionId: z.number().describe('Unique question ID'),
          text: z.string().describe('Question text'),
          metric: z.string().describe('Metric type for this question'),
          order: z.number().describe('Display order of the question'),
          ratingScale: z.number().nullable().describe('Rating scale (if applicable)'),
          required: z.boolean().describe('Whether this question is required'),
          choices: z
            .array(
              z.object({
                label: z.string(),
                value: z.string()
              })
            )
            .describe('Available choices for multiple-choice questions'),
          surveyId: z.number().describe('ID of the survey this question belongs to'),
          surveyName: z.string().describe('Name of the survey this question belongs to')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listQuestions({
      surveyId: ctx.input.surveyId,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let questions = result.results.map(q => ({
      questionId: q.id,
      text: q.text,
      metric: q.metric,
      order: q.order,
      ratingScale: q.rating_scale,
      required: q.required,
      choices: q.choices,
      surveyId: q.survey.id,
      surveyName: q.survey.name
    }));

    return {
      output: {
        totalCount: result.count,
        questions
      },
      message: `Found **${result.count}** question(s)${ctx.input.surveyId ? ` for survey #${ctx.input.surveyId}` : ''}. Returned **${questions.length}** on this page.`
    };
  })
  .build();
