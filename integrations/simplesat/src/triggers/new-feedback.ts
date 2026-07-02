import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newFeedback = SlateTrigger.create(spec, {
  name: 'New Feedback',
  key: 'new_feedback',
  description:
    'Triggers when a new survey response is submitted. Includes customer details, survey info, ticket data, and all individual answers.'
})
  .input(
    z.object({
      responseId: z.number().describe('Unique response ID'),
      created: z.string().describe('Response creation timestamp'),
      modified: z.string().describe('Response modification timestamp'),
      ipAddress: z.string().nullable().describe('Respondent IP address'),
      customer: z
        .object({
          name: z.string().nullable(),
          email: z.string().nullable(),
          company: z.string().nullable()
        })
        .nullable(),
      ticket: z
        .object({
          ticketId: z.string().nullable(),
          subject: z.string().nullable()
        })
        .nullable(),
      survey: z.object({
        surveyId: z.number(),
        surveyName: z.string()
      }),
      answers: z.array(
        z.object({
          answerId: z.number(),
          choice: z.string().nullable(),
          choiceLabel: z.string().nullable(),
          sentiment: z.string().nullable(),
          followUpAnswer: z.string().nullable(),
          questionId: z.number(),
          questionText: z.string()
        })
      )
    })
  )
  .output(
    z.object({
      responseId: z.number().describe('Unique response ID'),
      created: z.string().describe('When the response was submitted'),
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
          choiceLabel: z.string().nullable().describe('Display label of the choice'),
          sentiment: z.string().nullable().describe('Sentiment (positive, neutral, negative)'),
          followUpAnswer: z.string().nullable().describe('Follow-up text answer'),
          questionId: z.number().describe('Question ID'),
          questionText: z.string().describe('Question text')
        })
      )
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let lastSeenIds = (ctx.state?.lastSeenIds as number[] | undefined) ?? [];

      let now = new Date();
      let startDate = lastPolledAt
        ? lastPolledAt.split('T')[0]!
        : new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

      let result = await client.searchResponses({
        startDate,
        page: 1,
        pageSize: 100
      });

      let newResponses = result.results.filter(r => !lastSeenIds.includes(r.id));

      let inputs = newResponses.map(r => ({
        responseId: r.id,
        created: r.created,
        modified: r.modified,
        ipAddress: r.ip_address,
        customer: r.customer
          ? {
              name: r.customer.name,
              email: r.customer.email,
              company: r.customer.company
            }
          : null,
        ticket: r.ticket
          ? {
              ticketId: r.ticket.id,
              subject: r.ticket.subject
            }
          : null,
        survey: {
          surveyId: r.survey.id,
          surveyName: r.survey.name
        },
        answers: r.answers.map(a => ({
          answerId: a.id,
          choice: a.choice,
          choiceLabel: a.choice_label,
          sentiment: a.sentiment,
          followUpAnswer: a.follow_up_answer,
          questionId: a.question.id,
          questionText: a.question.text
        }))
      }));

      let allCurrentIds = result.results.map(r => r.id);

      return {
        inputs,
        updatedState: {
          lastPolledAt: now.toISOString(),
          lastSeenIds: allCurrentIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'response.created',
        id: String(ctx.input.responseId),
        output: {
          responseId: ctx.input.responseId,
          created: ctx.input.created,
          customerName: ctx.input.customer?.name ?? null,
          customerEmail: ctx.input.customer?.email ?? null,
          customerCompany: ctx.input.customer?.company ?? null,
          ticketId: ctx.input.ticket?.ticketId ?? null,
          ticketSubject: ctx.input.ticket?.subject ?? null,
          surveyId: ctx.input.survey.surveyId,
          surveyName: ctx.input.survey.surveyName,
          answers: ctx.input.answers
        }
      };
    }
  })
  .build();
