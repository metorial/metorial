import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let formSubmissionTrigger = SlateTrigger.create(spec, {
  name: 'Form Submission',
  key: 'form_submission',
  description:
    'Triggers when a new submission or partial submission is received on a Paperform form. Webhooks must be configured on the form (via the form editor UI or Business API).'
})
  .input(
    z.object({
      eventType: z
        .enum(['submission', 'partial_submission'])
        .describe('Type of submission event'),
      submissionId: z.string().describe('Unique submission ID'),
      formData: z
        .record(z.string(), z.unknown())
        .describe('Form answers keyed by field identifier'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique submission ID'),
      formId: z.string().optional().describe('Associated form ID if available'),
      formData: z
        .record(z.string(), z.unknown())
        .describe('Form answers keyed by field identifier'),
      ipAddress: z.string().optional().describe('Submitter IP address'),
      createdAt: z.string().optional().describe('Submission timestamp'),
      charge: z
        .record(z.string(), z.unknown())
        .nullable()
        .optional()
        .describe('Payment information if applicable')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      // Determine event type from the payload
      // Paperform sends webhook POSTs with submission data
      // Partial submissions have a different structure
      let isPartial = !!(data.partial || data.is_partial);
      let eventType: 'submission' | 'partial_submission' = isPartial
        ? 'partial_submission'
        : 'submission';

      let submissionId = String(data.id || data.submission_id || crypto.randomUUID());

      // The data field in the webhook contains form answers
      let formData = (data.data || data) as Record<string, unknown>;

      return {
        inputs: [
          {
            eventType,
            submissionId,
            formData,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload;

      return {
        type: `submission.${ctx.input.eventType}`,
        id: ctx.input.submissionId,
        output: {
          submissionId: ctx.input.submissionId,
          formId: payload.form_id ? String(payload.form_id) : undefined,
          formData: ctx.input.formData,
          ipAddress: payload.ip_address ? String(payload.ip_address) : undefined,
          createdAt: payload.created_at ? String(payload.created_at) : undefined,
          charge: (payload.charge as Record<string, unknown>) ?? null
        }
      };
    }
  })
  .build();
