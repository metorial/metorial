import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getResponses = SlateTool.create(spec, {
  name: 'Get Responses',
  key: 'get_responses',
  description: `Retrieve complete survey responses. A response groups all answers from the same survey submission, including customer details, ticket info, and all individual answers. Supports filtering by date range.`,
  instructions: [
    'Use YYYY-MM-DD dates or ISO 8601 timestamps for date filters. Date-only ranges include the full end date.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z
        .string()
        .optional()
        .describe('Start date filter as a YYYY-MM-DD date or ISO 8601 timestamp'),
      endDate: z
        .string()
        .optional()
        .describe('End date filter as a YYYY-MM-DD date or ISO 8601 timestamp'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching responses'),
      responses: z.array(
        z.object({
          responseId: z.number().describe('Unique response ID'),
          created: z.string().describe('Creation timestamp'),
          modified: z.string().describe('Last modification timestamp'),
          ipAddress: z.string().nullable().describe('IP address of the respondent'),
          customerName: z.string().nullable().describe('Customer name'),
          customerEmail: z.string().nullable().describe('Customer email'),
          customerCompany: z.string().nullable().describe('Customer company'),
          ticketId: z.string().nullable().describe('Associated ticket ID'),
          ticketSubject: z.string().nullable().describe('Associated ticket subject'),
          surveyId: z.number().describe('ID of the survey'),
          surveyName: z.string().describe('Name of the survey'),
          answers: z.array(
            z.object({
              answerId: z.number().describe('Answer ID'),
              choice: z.string().nullable().describe('Selected choice value'),
              choiceLabel: z
                .string()
                .nullable()
                .describe('Display label of the selected choice'),
              sentiment: z.string().nullable().describe('Sentiment classification'),
              followUpAnswer: z.string().nullable().describe('Follow-up text answer'),
              questionId: z.number().describe('Question ID'),
              questionText: z.string().describe('Question text')
            })
          )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchResponses({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let responses = result.results.map(r => ({
      responseId: r.id,
      created: r.created,
      modified: r.modified,
      ipAddress: r.ip_address ?? null,
      customerName: r.customer?.name ?? null,
      customerEmail: r.customer?.email ?? null,
      customerCompany: r.customer?.company ?? null,
      ticketId: r.ticket?.id == null ? null : String(r.ticket.id),
      ticketSubject: r.ticket?.subject ?? null,
      surveyId: r.survey.id,
      surveyName: r.survey.name,
      answers: r.answers.map(a => ({
        answerId: a.id,
        choice: a.choice ?? null,
        choiceLabel: a.choice_label ?? null,
        sentiment: a.sentiment ?? null,
        followUpAnswer: a.follow_up_answer ?? null,
        questionId: a.question.id,
        questionText: a.question.text
      }))
    }));

    let dateRange = '';
    if (ctx.input.startDate || ctx.input.endDate) {
      dateRange = ` (${ctx.input.startDate ?? '...'} to ${ctx.input.endDate ?? '...'})`;
    }

    return {
      output: {
        totalCount: result.count,
        responses
      },
      message: `Found **${result.count}** response(s)${dateRange}. Returned **${responses.length}** on this page.`
    };
  })
  .build();
