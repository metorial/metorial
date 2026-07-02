import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubmission = SlateTool.create(spec, {
  name: 'Get Submission',
  key: 'get_submission',
  description: `Retrieve a specific form submission by its ID. Returns the full submission data including all form answers, device information, payment/charge details, and generated PDFs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      submissionId: z.string().describe('The unique submission ID')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique submission ID'),
      formId: z.string().describe('Associated form ID'),
      formData: z
        .record(z.string(), z.unknown())
        .describe('Form answers keyed by field identifier'),
      device: z.record(z.string(), z.unknown()).describe('Device information from submission'),
      charge: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Payment details if applicable'),
      pdfs: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Generated PDFs with URL and filename'),
      createdAt: z.string().describe('Submission timestamp (UTC)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let s = await client.getSubmission(ctx.input.submissionId);

    return {
      output: {
        submissionId: s.id,
        formId: s.form_id,
        formData: s.data,
        device: s.device,
        charge: s.charge,
        pdfs: s.pdfs,
        createdAt: s.created_at_utc
      },
      message: `Retrieved submission **${s.id}** for form ${s.form_id}, created at ${s.created_at_utc}.`
    };
  })
  .build();
