import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listSatisfactionSurveys = SlateTool.create(spec, {
  name: 'List Satisfaction Surveys',
  key: 'list_satisfaction_surveys',
  description: `Retrieve a paginated list of customer satisfaction surveys (CSAT). Surveys capture customer feedback after support interactions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Number of surveys to return')
    })
  )
  .output(
    z.object({
      surveys: z.array(
        z.object({
          surveyId: z.number().describe('Survey ID'),
          score: z.number().nullable().describe('Survey score'),
          comment: z.string().nullable().describe('Customer comment'),
          ticketId: z.number().nullable().describe('Associated ticket ID'),
          customerEmail: z.string().nullable().describe('Customer email'),
          createdDatetime: z.string().nullable().describe('When the survey was created'),
          scoredDatetime: z.string().nullable().describe('When the customer responded')
        })
      ),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      prevCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result = await client.listSatisfactionSurveys({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let surveys = result.data.map((s: any) => ({
      surveyId: s.id,
      score: s.score ?? null,
      comment: s.comment || null,
      ticketId: s.ticket_id || s.ticket?.id || null,
      customerEmail: s.customer?.email || null,
      createdDatetime: s.created_datetime || null,
      scoredDatetime: s.scored_datetime || null
    }));

    return {
      output: {
        surveys,
        nextCursor: result.meta.next_cursor,
        prevCursor: result.meta.prev_cursor
      },
      message: `Found **${surveys.length}** satisfaction survey(s).`
    };
  })
  .build();
