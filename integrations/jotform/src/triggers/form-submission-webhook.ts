import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let formSubmissionWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Form Submission (Webhook)',
  key: 'form_submission_webhook',
  description:
    'Triggers instantly when a form submission is made through the JotForm UI. Configure the webhook URL in JotForm (Form Settings > Integrations > Webhooks) or use the **Manage Webhooks** tool to register it programmatically.',
  instructions: [
    'Set up the webhook URL in JotForm under Form Settings > Integrations > Webhooks, or use the Manage Webhooks tool.',
    'Only submissions made via the form submit button trigger this event — API-created submissions do not fire webhooks.'
  ]
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form that was submitted'),
      submissionId: z.string().describe('ID of the submission'),
      answers: z.record(z.string(), z.any()).describe('Map of field names to answer values')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique submission identifier'),
      formId: z.string().describe('ID of the form that was submitted'),
      answers: z.record(z.string(), z.any()).describe('Map of field names to submitted values')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      let contentType = ctx.request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        body = await ctx.request.json();
      } else {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      }

      let formId = String(body.formID || body.formId || '');
      let submissionId = String(body.submissionID || body.submissionId || '');

      let answers: Record<string, any> = {};
      if (body.rawRequest) {
        try {
          let rawData =
            typeof body.rawRequest === 'string'
              ? JSON.parse(body.rawRequest)
              : body.rawRequest;
          answers = rawData;
        } catch {
          answers = { raw: body.rawRequest };
        }
      }

      for (let [key, value] of Object.entries(body)) {
        if (
          key.startsWith('q') &&
          key.includes('_') &&
          !['formID', 'submissionID', 'webhookURL', 'rawRequest', 'pretty'].includes(key)
        ) {
          answers[key] = value;
        }
      }

      if (!submissionId) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            formId,
            submissionId,
            answers
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'submission.created',
        id: ctx.input.submissionId,
        output: {
          submissionId: ctx.input.submissionId,
          formId: ctx.input.formId,
          answers: ctx.input.answers
        }
      };
    }
  })
  .build();
