import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let feedbackReceived = SlateTrigger.create(spec, {
  name: 'Feedback Received',
  key: 'feedback_received',
  description:
    'Triggers when new feedback is submitted to a Mopinion form. Configure the webhook in your Mopinion dashboard under the desired form settings, using the "General (JSON)" webhook type and pointing it to the provided webhook URL.'
})
  .input(
    z.object({
      feedbackId: z.string().describe('Unique identifier for this feedback submission'),
      formName: z.string().optional().describe('Name of the form that received the feedback'),
      fields: z
        .record(z.string(), z.any())
        .describe('Feedback field values as key-value pairs'),
      raw: z.any().describe('Complete raw webhook payload')
    })
  )
  .output(
    z.object({
      feedbackId: z.string().describe('Unique identifier for this feedback submission'),
      formName: z.string().optional().describe('Name of the form that received the feedback'),
      fields: z
        .record(z.string(), z.any())
        .describe('Feedback field values as key-value pairs'),
      submittedAt: z.string().optional().describe('Timestamp when the feedback was submitted'),
      tags: z.array(z.string()).optional().describe('Tags associated with the feedback'),
      url: z.string().optional().describe('Page URL where the feedback was submitted'),
      browser: z.string().optional().describe('Browser used by the respondent'),
      device: z.string().optional().describe('Device type used by the respondent')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Mopinion webhook can send single or multiple feedback entries
      let entries = Array.isArray(data) ? data : [data];

      let inputs = entries.map((entry: any) => {
        // Extract a unique ID - Mopinion might use different field names
        let feedbackId = String(
          entry.id ||
            entry.feedback_id ||
            entry.feedbackId ||
            `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        );

        // Extract known meta fields, rest goes to fields
        let {
          id,
          feedback_id,
          feedbackId: fId,
          form_name,
          formName,
          created,
          tags,
          url,
          browser,
          device,
          ...remainingFields
        } = entry;

        return {
          feedbackId,
          formName: form_name || formName,
          fields: remainingFields,
          raw: entry
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.raw || {};

      return {
        type: 'feedback.received',
        id: ctx.input.feedbackId,
        output: {
          feedbackId: ctx.input.feedbackId,
          formName: ctx.input.formName,
          fields: ctx.input.fields,
          submittedAt: raw.created || raw.timestamp || raw.date,
          tags: raw.tags ? (Array.isArray(raw.tags) ? raw.tags : [raw.tags]) : undefined,
          url: raw.url || raw.page_url,
          browser: raw.browser,
          device: raw.device
        }
      };
    }
  })
  .build();
