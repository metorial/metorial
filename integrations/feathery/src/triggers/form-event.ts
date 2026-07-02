import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let formEvent = SlateTrigger.create(spec, {
  name: 'Form Event',
  key: 'form_event',
  description:
    'Triggered when a form receives data or is completed. Includes submitted field values, user ID, and step information.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of event: data_received or form_completion'),
      userId: z.string().describe('Feathery user ID who triggered the event'),
      stepId: z
        .string()
        .optional()
        .describe('Step ID that was submitted (for data_received events)'),
      fieldValues: z
        .record(z.string(), z.any())
        .describe('Key-value mapping of submitted field values'),
      fieldMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Field metadata details'),
      formId: z.string().optional().describe('Form ID from registration context'),
      rawPayload: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID who triggered the event'),
      stepId: z.string().optional().describe('Step ID that was submitted'),
      fieldValues: z.record(z.string(), z.any()).describe('Submitted field values'),
      formId: z.string().optional().describe('Form ID that was submitted')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let _client = new FeatheryClient({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      // We need a form ID to register the webhook on.
      // The webhook URL is stored on the form's integrations array.
      // We'll store the webhook URL; the user will need to set the form ID
      // as part of their workflow configuration. Since we can't know the form
      // at registration time, we register the URL and return details.

      // Get all forms and register webhook on each, or we return the URL
      // for manual configuration. Given the per-form nature, we return
      // the webhookBaseUrl for users to configure via the Update Form tool.

      return {
        registrationDetails: {
          webhookUrl: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async _ctx => {
      // Webhooks are per-form, and removing them would require
      // updating each form's integrations. Since we don't track
      // which forms were configured, this is a no-op.
      // Users should use the Update Form tool to remove webhooks.
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;

      // Feathery sends field values as a key-value mapping
      // with feathery_user_id and feathery_step_id as special keys
      let userId = body.feathery_user_id || body.user_id || '';
      let stepId = body.feathery_step_id || body.step_id;

      // Separate feathery metadata from field values
      let fieldValues: Record<string, any> = {};
      let fieldMetadata: Record<string, any> = {};

      for (let [key, value] of Object.entries(body)) {
        if (key.startsWith('feathery_')) {
          fieldMetadata[key] = value;
        } else {
          fieldValues[key] = value;
        }
      }

      // Determine event type based on presence of step ID
      let eventType = stepId ? 'data_received' : 'form_completion';

      // Extract form ID from metadata if available
      let formId = body.feathery_form_id || fieldMetadata.feathery_form_id;

      return {
        inputs: [
          {
            eventType,
            userId,
            stepId,
            fieldValues,
            fieldMetadata,
            formId,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType =
        ctx.input.eventType === 'form_completion' ? 'form.completed' : 'form.data_received';

      // Create a unique event ID from user, form, step, and timestamp
      let eventId = `${ctx.input.userId}-${ctx.input.formId || 'unknown'}-${ctx.input.stepId || 'complete'}-${Date.now()}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          userId: ctx.input.userId,
          stepId: ctx.input.stepId,
          fieldValues: ctx.input.fieldValues,
          formId: ctx.input.formId
        }
      };
    }
  })
  .build();
