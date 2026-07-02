import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let formSubmitted = SlateTrigger.create(spec, {
  name: 'Form Submitted',
  key: 'form_submitted',
  description: 'Triggers when a new form response is submitted in Bonsai.'
})
  .input(
    z.object({
      responseId: z.string().describe('ID of the form response'),
      formId: z.string().optional().describe('ID of the form'),
      formName: z.string().optional().describe('Name of the form'),
      respondentName: z.string().optional().describe('Respondent name'),
      respondentEmail: z.string().optional().describe('Respondent email'),
      answers: z
        .record(z.string(), z.any())
        .optional()
        .describe('Form response answers as key-value pairs'),
      timestamp: z.string().optional().describe('When the form was submitted')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('ID of the form response'),
      formId: z.string().optional().describe('ID of the form'),
      formName: z.string().optional().describe('Name of the form'),
      respondentName: z.string().optional().describe('Respondent name'),
      respondentEmail: z.string().optional().describe('Respondent email'),
      answers: z
        .record(z.string(), z.any())
        .optional()
        .describe('Form response answers as key-value pairs'),
      submittedAt: z.string().optional().describe('When the form was submitted')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let formResponse = data.form_response ?? data.response ?? data.resource ?? data;

      return {
        inputs: [
          {
            responseId: formResponse.id ?? formResponse.response_id ?? data.id ?? '',
            formId: formResponse.form_id ?? formResponse.formId ?? undefined,
            formName:
              formResponse.form_name ??
              formResponse.formName ??
              formResponse.form_title ??
              undefined,
            respondentName:
              formResponse.respondent_name ??
              formResponse.respondentName ??
              formResponse.name ??
              undefined,
            respondentEmail:
              formResponse.respondent_email ??
              formResponse.respondentEmail ??
              formResponse.email ??
              undefined,
            answers:
              formResponse.answers ??
              formResponse.responses ??
              formResponse.fields ??
              undefined,
            timestamp: data.timestamp ?? data.created_at ?? new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'form.submitted',
        id: `form-response-${ctx.input.responseId}-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          responseId: ctx.input.responseId,
          formId: ctx.input.formId,
          formName: ctx.input.formName,
          respondentName: ctx.input.respondentName,
          respondentEmail: ctx.input.respondentEmail,
          answers: ctx.input.answers,
          submittedAt: ctx.input.timestamp
        }
      };
    }
  })
  .build();
