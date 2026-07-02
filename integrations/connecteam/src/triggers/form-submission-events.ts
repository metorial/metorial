import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let formEventTypes = [
  'form_submission',
  'form_submission_edited',
  'manager_field_updated'
] as const;

export let formSubmissionEvents = SlateTrigger.create(spec, {
  name: 'Form Submission Events',
  key: 'form_submission_events',
  description:
    'Triggers when form submissions are created, edited, or when manager fields are updated in Connecteam forms.'
})
  .input(
    z.object({
      eventType: z.enum(formEventTypes).describe('Type of form event'),
      eventTimestamp: z.number().describe('Unix timestamp of the event'),
      requestId: z.string().describe('Unique request ID'),
      formSubmissionId: z.string().describe('Form submission ID'),
      formId: z.number().describe('Form template ID'),
      submittingUserId: z.number().optional().describe('Submitting user ID'),
      submissionTimestamp: z.number().optional().describe('Submission timestamp'),
      submissionTimezone: z.string().optional().describe('Submission timezone'),
      entryNum: z.number().optional().describe('Submission entry number'),
      isAnonymous: z.boolean().optional().describe('Whether submission is anonymous'),
      answers: z.array(z.any()).optional().describe('Submission answers'),
      managerFields: z.array(z.any()).optional().describe('Manager fields')
    })
  )
  .output(
    z.object({
      formSubmissionId: z.string().describe('Form submission ID'),
      formId: z.number().describe('Form template ID'),
      submittingUserId: z.number().optional().describe('Submitting user ID'),
      submissionTimestamp: z.number().optional().describe('Submission Unix timestamp'),
      submissionTimezone: z.string().optional().describe('Submission timezone'),
      entryNum: z.number().optional().describe('Submission entry number'),
      isAnonymous: z.boolean().optional().describe('Whether submission is anonymous'),
      answers: z.array(z.any()).optional().describe('Submission answers'),
      managerFields: z.array(z.any()).optional().describe('Manager fields')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let data = body.data;

      return {
        inputs: [
          {
            eventType: body.eventType as (typeof formEventTypes)[number],
            eventTimestamp: body.eventTimestamp ?? Math.floor(Date.now() / 1000),
            requestId: body.requestId ?? `form_${Date.now()}`,
            formSubmissionId: data?.formSubmissionId ?? '',
            formId: data?.formId ?? 0,
            submittingUserId: data?.submittingUserId,
            submissionTimestamp: data?.submissionTimestamp,
            submissionTimezone: data?.submissionTimezone,
            entryNum: data?.entryNum,
            isAnonymous: data?.isAnonymous,
            answers: data?.answers,
            managerFields: data?.managerFields
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, requestId, formSubmissionId } = ctx.input;

      return {
        type: `form.${eventType}`,
        id: `${requestId}_${formSubmissionId}`,
        output: {
          formSubmissionId: ctx.input.formSubmissionId,
          formId: ctx.input.formId,
          submittingUserId: ctx.input.submittingUserId,
          submissionTimestamp: ctx.input.submissionTimestamp,
          submissionTimezone: ctx.input.submissionTimezone,
          entryNum: ctx.input.entryNum,
          isAnonymous: ctx.input.isAnonymous,
          answers: ctx.input.answers,
          managerFields: ctx.input.managerFields
        }
      };
    }
  })
  .build();
