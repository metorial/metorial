import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let formSubmissionEvents = SlateTrigger.create(spec, {
  name: 'Form Submission Events',
  key: 'form_submission_events',
  description:
    'Triggers when new form submissions are received on a Netlify site. Captures submission data for all forms or a specific form.'
})
  .input(
    z.object({
      event: z.string().describe('The form event type'),
      submissionId: z.string().describe('Unique submission identifier'),
      submission: z.any().describe('Full submission payload from Netlify')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique submission identifier'),
      formId: z.string().describe('Form ID this submission belongs to'),
      formName: z.string().optional().describe('Form name'),
      siteUrl: z.string().optional().describe('Site URL'),
      submissionData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Form field data as key-value pairs'),
      name: z.string().optional().describe('Submitter name'),
      email: z.string().optional().describe('Submitter email'),
      company: z.string().optional().describe('Submitter company'),
      ip: z.string().optional().describe('Submitter IP address'),
      userAgent: z.string().optional().describe('Submitter user agent'),
      referrer: z.string().optional().describe('Referrer URL'),
      createdAt: z.string().optional().describe('Submission timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            event: 'submission.created',
            submissionId: data.id || '',
            submission: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let submission = ctx.input.submission;

      return {
        type: ctx.input.event,
        id: ctx.input.submissionId,
        output: {
          submissionId: submission.id || ctx.input.submissionId,
          formId: submission.form_id || '',
          formName: submission.form_name,
          siteUrl: submission.site_url,
          submissionData: submission.data,
          name: submission.name,
          email: submission.email,
          company: submission.company,
          ip: submission.ip,
          userAgent: submission.user_agent,
          referrer: submission.referrer,
          createdAt: submission.created_at
        }
      };
    }
  })
  .build();
