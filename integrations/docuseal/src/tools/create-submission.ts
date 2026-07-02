import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let submitterSchema = z.object({
  email: z.string().describe('Submitter email address'),
  role: z
    .string()
    .optional()
    .describe('Signer role as defined in the template (e.g. "Director", "Contractor")'),
  name: z.string().optional().describe('Submitter display name'),
  phone: z.string().optional().describe('Phone in E.164 format (e.g. +1234567890)'),
  values: z
    .record(z.string(), z.any())
    .optional()
    .describe('Pre-filled field values (field name -> value)'),
  externalId: z.string().optional().describe('Your application identifier for this submitter'),
  completed: z.boolean().optional().describe('Set true to auto-sign (counter-signing)'),
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom metadata for this submitter'),
  sendEmail: z.boolean().optional().describe('Send email notification to this submitter'),
  sendSms: z.boolean().optional().describe('Send SMS notification to this submitter'),
  completedRedirectUrl: z
    .string()
    .optional()
    .describe('Redirect URL after this submitter completes'),
  requirePhone2fa: z.boolean().optional().describe('Require phone 2FA verification'),
  requireEmail2fa: z.boolean().optional().describe('Require email 2FA verification'),
  message: z
    .object({
      subject: z.string().optional().describe('Custom email subject'),
      body: z.string().optional().describe('Custom email body')
    })
    .optional()
    .describe('Custom email message for this submitter')
});

export let createSubmission = SlateTool.create(spec, {
  name: 'Create Submission',
  key: 'create_submission',
  description: `Create a signature request (submission) from an existing template and send it to one or more submitters for signing. Supports sequential or parallel signing order, field pre-filling, expiration dates, custom email messaging, 2FA, and auto-signing.`,
  instructions: [
    'Provide at least one submitter with an email address.',
    'Use role names that match the roles defined in the template.',
    'Set order to "random" for parallel signing or "preserved" for sequential (default).'
  ]
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to create a submission from'),
      submitters: z.array(submitterSchema).describe('List of submitters (signers)'),
      sendEmail: z
        .boolean()
        .optional()
        .describe('Send signature request emails (default true)'),
      sendSms: z.boolean().optional().describe('Send signature requests via SMS'),
      order: z
        .enum(['preserved', 'random'])
        .optional()
        .describe('Signing order: "preserved" (sequential) or "random" (parallel)'),
      completedRedirectUrl: z
        .string()
        .optional()
        .describe('URL to redirect submitters to after completion'),
      bccCompleted: z
        .string()
        .optional()
        .describe('BCC email address for completed signed documents'),
      replyTo: z.string().optional().describe('Reply-to email address for notifications'),
      expireAt: z
        .string()
        .optional()
        .describe('Expiration date-time (ISO 8601) after which the submission is unavailable'),
      variables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Dynamic content variables for DOCX/HTML templates'),
      message: z
        .object({
          subject: z.string().optional().describe('Custom email subject'),
          body: z
            .string()
            .optional()
            .describe('Custom email body (supports template variables)')
        })
        .optional()
        .describe('Custom email message for all submitters')
    })
  )
  .output(
    z.object({
      submitters: z
        .array(
          z.object({
            submitterId: z.number().describe('Submitter ID'),
            submissionId: z.number().optional().describe('Submission ID'),
            uuid: z.string().optional().describe('Submitter UUID'),
            slug: z.string().optional().describe('Submitter slug'),
            email: z.string().describe('Submitter email'),
            role: z.string().optional().describe('Submitter role'),
            status: z.string().optional().describe('Submitter status'),
            embedSrc: z.string().optional().describe('Embed URL for signing form')
          })
        )
        .describe('Created submitters with their signing details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.createSubmission({
      templateId: ctx.input.templateId,
      submitters: ctx.input.submitters,
      sendEmail: ctx.input.sendEmail,
      sendSms: ctx.input.sendSms,
      order: ctx.input.order,
      completedRedirectUrl: ctx.input.completedRedirectUrl,
      bccCompleted: ctx.input.bccCompleted,
      replyTo: ctx.input.replyTo,
      expireAt: ctx.input.expireAt,
      variables: ctx.input.variables,
      message: ctx.input.message
    });

    let submitters = (Array.isArray(data) ? data : [data]).map((s: any) => ({
      submitterId: s.id,
      submissionId: s.submission_id,
      uuid: s.uuid,
      slug: s.slug,
      email: s.email,
      role: s.role,
      status: s.status,
      embedSrc: s.embed_src
    }));

    return {
      output: { submitters },
      message: `Created submission with **${submitters.length}** submitter(s) from template ID ${ctx.input.templateId}.`
    };
  })
  .build();
