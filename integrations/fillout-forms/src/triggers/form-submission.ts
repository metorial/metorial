import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  calculationResponseSchema,
  loginResponseSchema,
  paymentResponseSchema,
  questionResponseSchema,
  quizResponseSchema,
  schedulingResponseSchema,
  urlParameterResponseSchema
} from '../lib/types';
import { spec } from '../spec';

export let formSubmission = SlateTrigger.create(spec, {
  name: 'Form Submission',
  key: 'form_submission',
  description:
    'Triggers when a new submission is received for a Fillout form. The webhook must be registered for a specific form.'
})
  .input(
    z.object({
      submissionId: z.string().describe('Unique identifier of the submission'),
      formId: z.string().describe('Identifier of the form'),
      submissionTime: z.string().describe('ISO 8601 timestamp of the submission'),
      lastUpdatedAt: z.string().optional().describe('ISO 8601 timestamp of the last update'),
      questions: z.array(questionResponseSchema).describe('Question responses'),
      calculations: z
        .array(calculationResponseSchema)
        .optional()
        .describe('Calculated values'),
      urlParameters: z
        .array(urlParameterResponseSchema)
        .optional()
        .describe('URL parameter values'),
      scheduling: z.array(schedulingResponseSchema).optional().describe('Scheduling details'),
      payments: z.array(paymentResponseSchema).optional().describe('Payment information'),
      quiz: quizResponseSchema.optional().describe('Quiz score results'),
      login: loginResponseSchema.optional().describe('Login information')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique identifier of the submission'),
      formId: z.string().describe('Identifier of the form'),
      submissionTime: z.string().describe('ISO 8601 timestamp of the submission'),
      lastUpdatedAt: z.string().optional().describe('ISO 8601 timestamp of the last update'),
      questions: z.array(questionResponseSchema).describe('Question responses'),
      calculations: z
        .array(calculationResponseSchema)
        .optional()
        .describe('Calculated values'),
      urlParameters: z
        .array(urlParameterResponseSchema)
        .optional()
        .describe('URL parameter values'),
      scheduling: z.array(schedulingResponseSchema).optional().describe('Scheduling details'),
      payments: z.array(paymentResponseSchema).optional().describe('Payment information'),
      quiz: quizResponseSchema.optional().describe('Quiz score results'),
      login: loginResponseSchema.optional().describe('Login information')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.auth.baseUrl || ctx.config.baseUrl
      });

      let formId = (ctx.state as any)?.formId;
      if (!formId) {
        throw new Error(
          'formId is required in state to register a webhook. Set formId in the trigger configuration.'
        );
      }

      let result = await client.createWebhook(formId, ctx.input.webhookBaseUrl);

      return {
        registrationDetails: {
          webhookId: String(result.id),
          formId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.auth.baseUrl || ctx.config.baseUrl
      });

      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Fillout sends submissions in the same format as the /submissions endpoint responses
      // It may be a single submission object or wrapped in some envelope
      let submissions: any[] = [];
      if (Array.isArray(data)) {
        submissions = data;
      } else if (data.submissionId) {
        submissions = [data];
      } else if (data.responses && Array.isArray(data.responses)) {
        submissions = data.responses;
      } else if (data.submission) {
        submissions = [data.submission];
      } else {
        submissions = [data];
      }

      return {
        inputs: submissions.map((sub: any) => ({
          submissionId: sub.submissionId ?? '',
          formId: sub.formId ?? '',
          submissionTime: sub.submissionTime ?? '',
          lastUpdatedAt: sub.lastUpdatedAt,
          questions: sub.questions ?? [],
          calculations: sub.calculations,
          urlParameters: sub.urlParameters,
          scheduling: sub.scheduling,
          payments: sub.payments,
          quiz: sub.quiz,
          login: sub.login
        }))
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'submission.created',
        id: ctx.input.submissionId,
        output: {
          submissionId: ctx.input.submissionId,
          formId: ctx.input.formId,
          submissionTime: ctx.input.submissionTime,
          lastUpdatedAt: ctx.input.lastUpdatedAt,
          questions: ctx.input.questions,
          calculations: ctx.input.calculations,
          urlParameters: ctx.input.urlParameters,
          scheduling: ctx.input.scheduling,
          payments: ctx.input.payments,
          quiz: ctx.input.quiz,
          login: ctx.input.login
        }
      };
    }
  })
  .build();
