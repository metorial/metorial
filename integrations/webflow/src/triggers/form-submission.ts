import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let formSubmissionTrigger = SlateTrigger.create(spec, {
  name: 'Form Submission',
  key: 'form_submission',
  description:
    'Triggered when a form is submitted on a Webflow site. Includes the form name, submitted data, and metadata.'
})
  .input(
    z.object({
      triggerType: z.string().describe('Webhook trigger type'),
      formName: z.string().optional().describe('Name of the form that was submitted'),
      formId: z.string().optional().describe('Form identifier'),
      siteId: z.string().optional().describe('Site the form belongs to'),
      submissionId: z.string().optional().describe('Unique submission identifier'),
      formData: z.record(z.string(), z.any()).optional().describe('Submitted form data'),
      submittedAt: z.string().optional().describe('Submission timestamp'),
      rawPayload: z.any().optional().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      formName: z.string().optional().describe('Name of the submitted form'),
      formId: z.string().optional().describe('Form identifier'),
      siteId: z.string().optional().describe('Site the form belongs to'),
      submittedAt: z.string().optional().describe('ISO 8601 submission timestamp'),
      formData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value pairs of submitted form fields')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      if (!ctx.config.siteId) {
        throw new Error('siteId is required in config for automatic webhook registration');
      }
      let client = new WebflowClient(ctx.auth.token);
      let webhook = await client.createWebhook(ctx.config.siteId, {
        triggerType: 'form_submission',
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          webhookId: webhook.id ?? webhook._id,
          siteId: ctx.config.siteId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WebflowClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let submissionId = data._id ?? data.id ?? data.submissionId ?? crypto.randomUUID();

      return {
        inputs: [
          {
            triggerType: data.triggerType ?? 'form_submission',
            formName: data.name ?? data.formName,
            formId: data.formId ?? data._id,
            siteId: data.siteId ?? data.site,
            submissionId,
            formData: data.data ?? data.formData ?? data.fieldData,
            submittedAt: data.submittedAt ?? data.d ?? data.createdOn,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'form.submitted',
        id: ctx.input.submissionId ?? crypto.randomUUID(),
        output: {
          formName: ctx.input.formName,
          formId: ctx.input.formId,
          siteId: ctx.input.siteId,
          submittedAt: ctx.input.submittedAt,
          formData: ctx.input.formData
        }
      };
    }
  })
  .build();
