import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fieldSchema = z.object({
  key: z.string().describe('Unique question identifier'),
  label: z.string().describe('Human-readable field label'),
  type: z.string().describe('Field type (e.g., INPUT_TEXT, INPUT_EMAIL, MULTIPLE_CHOICE)'),
  value: z.any().describe('Submitted value')
});

export let formResponse = SlateTrigger.create(spec, {
  name: 'Form Response',
  key: 'form_response',
  description: 'Triggers when a new form submission is received on a Tally form.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      eventType: z.string().describe('Event type (FORM_RESPONSE)'),
      createdAt: z.string().describe('ISO 8601 event timestamp'),
      submissionId: z.string().describe('Unique submission identifier'),
      respondentId: z.string().describe('Unique respondent identifier'),
      formId: z.string().describe('Form the submission belongs to'),
      formName: z.string().describe('Name of the form'),
      submittedAt: z.string().describe('ISO 8601 submission timestamp'),
      fields: z.array(fieldSchema).describe('Submitted field values')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique submission identifier'),
      respondentId: z.string().describe('Unique respondent identifier'),
      formId: z.string().describe('Form the submission belongs to'),
      formName: z.string().describe('Name of the form'),
      submittedAt: z.string().describe('ISO 8601 submission timestamp'),
      fields: z.array(fieldSchema).describe('Submitted field values')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // List all forms so the user can receive events from all of them,
      // or create webhooks for all forms the user has access to.
      // Since Tally requires a formId per webhook, we list forms and create webhooks for each.
      // However, for a generic trigger, we'll register a single webhook per form.
      // The platform provides webhookBaseUrl - we just need to register with Tally.

      // For auto-registration we register for ALL forms the user has.
      // We paginate through all forms and register webhooks.
      let registeredWebhooks: Array<{ webhookId: string; formId: string }> = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        let forms = await client.listForms({ page, limit: 100 });

        for (let form of forms.items) {
          try {
            let webhook = await client.createWebhook({
              formId: form.id,
              url: ctx.input.webhookBaseUrl,
              eventTypes: ['FORM_RESPONSE']
            });

            registeredWebhooks.push({
              webhookId: webhook.id,
              formId: form.id
            });
          } catch (_e) {
            // Skip forms where webhook creation fails (e.g., permissions)
          }
        }

        hasMore = forms.hasMore;
        page++;
      }

      return {
        registrationDetails: {
          webhooks: registeredWebhooks
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let details = ctx.input.registrationDetails as {
        webhooks: Array<{ webhookId: string; formId: string }>;
      };

      if (details?.webhooks) {
        for (let webhook of details.webhooks) {
          try {
            await client.deleteWebhook(webhook.webhookId);
          } catch (_e) {
            // Ignore errors during cleanup (webhook may already be deleted)
          }
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Tally sends a single FORM_RESPONSE event per webhook request
      if (body.eventType !== 'FORM_RESPONSE') {
        return { inputs: [] };
      }

      let responseData = body.data ?? {};

      return {
        inputs: [
          {
            eventId: body.eventId,
            eventType: body.eventType,
            createdAt: body.createdAt,
            submissionId: responseData.submissionId ?? responseData.responseId,
            respondentId: responseData.respondentId,
            formId: responseData.formId,
            formName: responseData.formName,
            submittedAt: responseData.createdAt,
            fields: responseData.fields ?? []
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'form_response.created',
        id: ctx.input.eventId,
        output: {
          submissionId: ctx.input.submissionId,
          respondentId: ctx.input.respondentId,
          formId: ctx.input.formId,
          formName: ctx.input.formName,
          submittedAt: ctx.input.submittedAt,
          fields: ctx.input.fields
        }
      };
    }
  })
  .build();
