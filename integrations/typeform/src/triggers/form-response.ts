import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { typeformServiceError } from '../lib/errors';
import { spec } from '../spec';

let answerInputSchema = z.object({
  fieldId: z.string().optional().describe('Field ID'),
  fieldType: z.string().optional().describe('Field type'),
  fieldRef: z.string().optional().describe('Field reference'),
  type: z.string().describe('Answer type'),
  text: z.string().optional(),
  email: z.string().optional(),
  number: z.number().optional(),
  boolean: z.boolean().optional(),
  date: z.string().optional(),
  url: z.string().optional(),
  fileUrl: z.string().optional(),
  choiceLabel: z.string().optional(),
  choiceLabels: z.array(z.string()).optional(),
  paymentAmount: z.string().optional(),
  paymentSuccess: z.boolean().optional()
});

export let formResponse = SlateTrigger.create(spec, {
  name: 'Form Response',
  key: 'form_response',
  description:
    'Triggered when a form response is submitted (complete or partial). Receives the full response data including answers, hidden fields, scores, and metadata. Set the formId in config for automatic webhook registration.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique webhook event ID'),
      eventType: z.string().describe('Event type (form_response or form_response_partial)'),
      formId: z.string().describe('Form ID'),
      responseToken: z.string().describe('Unique response token'),
      submittedAt: z.string().optional().describe('Submission timestamp'),
      landedAt: z.string().optional().describe('Landing timestamp'),
      formTitle: z.string().optional().describe('Form title'),
      answers: z.array(answerInputSchema).describe('Response answers'),
      hiddenFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Hidden field values'),
      calculatedScore: z.number().optional().describe('Calculated quiz score'),
      variables: z
        .array(
          z.object({
            key: z.string(),
            type: z.string(),
            numberValue: z.number().optional(),
            textValue: z.string().optional()
          })
        )
        .optional()
        .describe('Response variables'),
      endingRef: z.string().optional().describe('Reference of the ending screen shown')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Form ID'),
      formTitle: z.string().optional().describe('Form title'),
      responseToken: z.string().describe('Unique response token (use for deletion)'),
      submittedAt: z.string().optional().describe('Submission timestamp (ISO 8601)'),
      landedAt: z
        .string()
        .optional()
        .describe('Timestamp when respondent first opened the form'),
      isPartial: z.boolean().describe('Whether this is a partial (incomplete) response'),
      answers: z
        .array(
          z.object({
            fieldId: z.string().optional().describe('Field ID'),
            fieldType: z.string().optional().describe('Field type'),
            fieldRef: z.string().optional().describe('Field reference'),
            type: z.string().describe('Answer type'),
            text: z.string().optional().describe('Text answer value'),
            email: z.string().optional().describe('Email answer value'),
            number: z.number().optional().describe('Number answer value'),
            boolean: z.boolean().optional().describe('Yes/no answer value'),
            date: z.string().optional().describe('Date answer value'),
            url: z.string().optional().describe('URL answer value'),
            fileUrl: z.string().optional().describe('Uploaded file URL'),
            choiceLabel: z.string().optional().describe('Selected choice label'),
            choiceLabels: z
              .array(z.string())
              .optional()
              .describe('Selected choice labels for multi-select'),
            paymentAmount: z.string().optional().describe('Payment amount'),
            paymentSuccess: z.boolean().optional().describe('Whether payment succeeded')
          })
        )
        .describe('Array of answers'),
      hiddenFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Hidden field values passed via form URL'),
      calculatedScore: z.number().optional().describe('Calculated quiz score'),
      variables: z
        .array(
          z.object({
            key: z.string().describe('Variable key'),
            type: z.string().describe('Variable type'),
            numberValue: z.number().optional().describe('Numeric value'),
            textValue: z.string().optional().describe('Text value')
          })
        )
        .optional()
        .describe('Response variables'),
      endingRef: z.string().optional().describe('Reference of the ending screen shown')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      if (!ctx.config.formId) {
        throw typeformServiceError(
          'formId is required in config for automatic webhook registration.'
        );
      }

      let client = new TypeformClient({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let tag = `slates_${Date.now()}`;

      let result = await client.createOrUpdateWebhook(ctx.config.formId, tag, {
        url: ctx.input.webhookBaseUrl,
        enabled: true,
        eventTypes: {
          form_response_partial: true
        }
      });

      return {
        registrationDetails: {
          formId: ctx.config.formId,
          tag: result.tag || tag
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TypeformClient({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let details = ctx.input.registrationDetails as { formId: string; tag: string };
      await client.deleteWebhook(details.formId, details.tag);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event_type || 'form_response';
      let eventId = data.event_id || '';
      let formResponseData = data.form_response;

      if (!formResponseData) {
        return { inputs: [] };
      }

      let answers = (formResponseData.answers || []).map((a: any) => {
        let answer: Record<string, any> = {
          fieldId: a.field?.id,
          fieldType: a.field?.type,
          fieldRef: a.field?.ref,
          type: a.type
        };
        if (a.text !== undefined) answer.text = a.text;
        if (a.email !== undefined) answer.email = a.email;
        if (a.number !== undefined) answer.number = a.number;
        if (a.boolean !== undefined) answer.boolean = a.boolean;
        if (a.date !== undefined) answer.date = a.date;
        if (a.url !== undefined) answer.url = a.url;
        if (a.file_url !== undefined) answer.fileUrl = a.file_url;
        if (a.choice?.label) answer.choiceLabel = a.choice.label;
        if (a.choices?.labels) answer.choiceLabels = a.choices.labels;
        if (a.payment) {
          answer.paymentAmount = a.payment.amount;
          answer.paymentSuccess = a.payment.success;
        }
        return answer;
      });

      let variables = formResponseData.variables?.map((v: any) => ({
        key: v.key,
        type: v.type,
        numberValue: v.number,
        textValue: v.text
      }));

      return {
        inputs: [
          {
            eventId,
            eventType,
            formId: formResponseData.form_id,
            responseToken: formResponseData.token,
            submittedAt: formResponseData.submitted_at,
            landedAt: formResponseData.landed_at,
            formTitle: formResponseData.definition?.title,
            answers,
            hiddenFields: formResponseData.hidden,
            calculatedScore: formResponseData.calculated?.score,
            variables,
            endingRef: formResponseData.ending?.ref
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let isPartial = ctx.input.eventType === 'form_response_partial';

      return {
        type: isPartial ? 'form_response.partial' : 'form_response.submitted',
        id: ctx.input.eventId || ctx.input.responseToken,
        output: {
          formId: ctx.input.formId,
          formTitle: ctx.input.formTitle,
          responseToken: ctx.input.responseToken,
          submittedAt: ctx.input.submittedAt,
          landedAt: ctx.input.landedAt,
          isPartial,
          answers: ctx.input.answers,
          hiddenFields: ctx.input.hiddenFields,
          calculatedScore: ctx.input.calculatedScore,
          variables: ctx.input.variables,
          endingRef: ctx.input.endingRef
        }
      };
    }
  })
  .build();
