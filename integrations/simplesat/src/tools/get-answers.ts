import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAnswers = SlateTool.create(spec, {
  name: 'Get Answers',
  key: 'get_answers',
  description: `Retrieve individual feedback answers from survey questions. Answers are individual ratings or comments. Supports filtering by date range to narrow results. Each answer includes the choice, sentiment, follow-up text, and associated question/survey info.`,
  instructions: ['Use YYYY-MM-DD format for date filters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().optional().describe('Start date filter in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date filter in YYYY-MM-DD format'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching answers'),
      answers: z.array(
        z.object({
          answerId: z.number().describe('Unique answer ID'),
          choice: z.string().nullable().describe('Selected choice value'),
          choiceLabel: z.string().nullable().describe('Display label of the selected choice'),
          sentiment: z
            .string()
            .nullable()
            .describe('Sentiment classification (positive, neutral, negative)'),
          followUpAnswer: z.string().nullable().describe('Follow-up text answer if provided'),
          publishedAsTestimonial: z
            .boolean()
            .describe('Whether this answer is published as a testimonial'),
          created: z.string().describe('Creation timestamp'),
          modified: z.string().describe('Last modification timestamp'),
          responseId: z.number().describe('ID of the parent response'),
          questionId: z.number().describe('ID of the question answered'),
          questionText: z.string().describe('Text of the question answered'),
          surveyId: z.number().describe('ID of the survey'),
          surveyName: z.string().describe('Name of the survey')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchAnswers({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let answers = result.results.map(a => ({
      answerId: a.id,
      choice: a.choice,
      choiceLabel: a.choice_label,
      sentiment: a.sentiment,
      followUpAnswer: a.follow_up_answer,
      publishedAsTestimonial: a.published_as_testimonial,
      created: a.created,
      modified: a.modified,
      responseId: a.response_id,
      questionId: a.question.id,
      questionText: a.question.text,
      surveyId: a.survey.id,
      surveyName: a.survey.name
    }));

    let dateRange = '';
    if (ctx.input.startDate || ctx.input.endDate) {
      dateRange = ` (${ctx.input.startDate ?? '...'} to ${ctx.input.endDate ?? '...'})`;
    }

    return {
      output: {
        totalCount: result.count,
        answers
      },
      message: `Found **${result.count}** answer(s)${dateRange}. Returned **${answers.length}** on this page.`
    };
  })
  .build();
