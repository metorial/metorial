import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSubmissionFromPdf = SlateTool.create(spec, {
  name: 'Create Submission from PDF',
  key: 'create_submission_from_pdf',
  description: `Create a one-off signature request directly from a PDF document without needing a pre-existing template. The PDF can use text tags like \`{{Field Name;role=Signer1;type=date}}\` to define fillable fields, or fields can be specified with pixel coordinates.`,
  instructions: [
    'Provide at least one document with a file (base64-encoded or URL) and at least one submitter.',
    'Text field tags in the PDF will be automatically parsed into fillable fields.'
  ]
})
  .input(
    z.object({
      name: z.string().optional().describe('Submission name'),
      documents: z
        .array(
          z.object({
            name: z.string().describe('Document name'),
            file: z.string().describe('Base64-encoded PDF content or downloadable URL'),
            fields: z
              .array(z.record(z.string(), z.any()))
              .optional()
              .describe('Field definitions with pixel coordinates')
          })
        )
        .describe('PDF documents to sign'),
      submitters: z
        .array(
          z.object({
            email: z.string().describe('Submitter email address'),
            role: z.string().optional().describe('Signer role'),
            name: z.string().optional().describe('Submitter name'),
            phone: z.string().optional().describe('Phone in E.164 format'),
            sendEmail: z.boolean().optional().describe('Send email notification'),
            sendSms: z.boolean().optional().describe('Send SMS notification')
          })
        )
        .describe('Submitters (signers)'),
      sendEmail: z
        .boolean()
        .optional()
        .describe('Send signature request emails (default true)'),
      order: z.enum(['preserved', 'random']).optional().describe('Signing order'),
      flatten: z.boolean().optional().describe('Remove PDF form fields'),
      mergeDocuments: z
        .boolean()
        .optional()
        .describe('Merge multiple documents into a single PDF'),
      removeTags: z.boolean().optional().describe('Remove {{text}} tags from PDF'),
      message: z
        .object({
          subject: z.string().optional(),
          body: z.string().optional()
        })
        .optional()
        .describe('Custom email message')
    })
  )
  .output(
    z.object({
      submissionId: z.number().optional().describe('Submission ID'),
      submitters: z
        .array(
          z.object({
            submitterId: z.number().describe('Submitter ID'),
            email: z.string().describe('Submitter email'),
            slug: z.string().optional().describe('Submitter slug'),
            status: z.string().optional().describe('Submitter status'),
            embedSrc: z.string().optional().describe('Embed URL for signing form')
          })
        )
        .describe('Created submitters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.createSubmissionFromPdf({
      name: ctx.input.name,
      documents: ctx.input.documents,
      submitters: ctx.input.submitters,
      sendEmail: ctx.input.sendEmail,
      order: ctx.input.order,
      message: ctx.input.message,
      flatten: ctx.input.flatten,
      mergeDocuments: ctx.input.mergeDocuments,
      removeTags: ctx.input.removeTags
    });

    let submitters = (data.submitters || (Array.isArray(data) ? data : [data])).map(
      (s: any) => ({
        submitterId: s.id,
        email: s.email,
        slug: s.slug,
        status: s.status,
        embedSrc: s.embed_src
      })
    );

    return {
      output: {
        submissionId: data.id || data.submission_id,
        submitters
      },
      message: `Created one-off PDF submission with **${submitters.length}** submitter(s).`
    };
  })
  .build();
