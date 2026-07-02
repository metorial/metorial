import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let formResponseTrigger = SlateTrigger.create(spec, {
  name: 'Form Response',
  key: 'form_response',
  description:
    'Triggers when a user completes and submits a form. Includes form fields, responses, respondent email, and a URL to the finished PDF.'
})
  .input(
    z.object({
      webhookEvent: z.string().describe('The webhook event type'),
      formId: z.string().optional().describe('ID of the form'),
      formResponseId: z.string().optional().describe('ID of the form response'),
      formTitle: z.string().optional().describe('Title of the form'),
      respondentEmail: z.string().optional().describe('Email of the form respondent'),
      finishedPdfUrl: z.string().optional().describe('URL to the completed PDF'),
      responses: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Form field responses'),
      rawPayload: z.record(z.string(), z.any()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      formId: z.string().optional().describe('ID of the form'),
      formResponseId: z.string().optional().describe('ID of the form response'),
      formTitle: z.string().optional().describe('Title of the form'),
      respondentEmail: z.string().optional().describe('Email of the form respondent'),
      finishedPdfUrl: z.string().optional().describe('URL to the completed PDF'),
      responses: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Form field responses with questions and answers')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let items = Array.isArray(data) ? data : [data];

      let inputs = items.map((item: any) => ({
        webhookEvent: item.webhookEvent ?? 'new_form_response',
        formId: item.formId,
        formResponseId: item.formResponseId,
        formTitle: item.formTitle,
        respondentEmail: item.respondentEmail,
        finishedPdfUrl: item.finishedPdfUrl,
        responses: item.response ?? item.responses,
        rawPayload: item
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: 'form.response_submitted',
        id: ctx.input.formResponseId ?? `${ctx.input.formId ?? 'unknown'}-${Date.now()}`,
        output: {
          formId: ctx.input.formId,
          formResponseId: ctx.input.formResponseId,
          formTitle: ctx.input.formTitle,
          respondentEmail: ctx.input.respondentEmail,
          finishedPdfUrl: ctx.input.finishedPdfUrl,
          responses: ctx.input.responses
        }
      };
    }
  })
  .build();
