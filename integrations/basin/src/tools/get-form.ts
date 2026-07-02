import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getForm = SlateTool.create(spec, {
  name: 'Get Form',
  key: 'get_form',
  description: `Retrieve detailed information about a specific form endpoint, including its configuration, spam settings, notification preferences, and submission counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.number().describe('ID of the form to retrieve.')
    })
  )
  .output(
    z.object({
      formId: z.number().describe('Form ID.'),
      uuid: z.string().describe('Form UUID.'),
      name: z.string().describe('Form name.'),
      enabled: z.boolean().describe('Whether the form is enabled.'),
      endpointUrl: z.string().describe('The unique Basin form endpoint URL.'),
      projectId: z.number().nullable().describe('Associated project ID.'),
      redirectUrl: z.string().nullable().describe('Custom redirect URL after submission.'),
      notificationEmails: z.string().nullable().describe('Notification email addresses.'),
      honeypotField: z
        .string()
        .nullable()
        .describe('Honeypot field name for spam protection.'),
      captchaProvider: z.string().nullable().describe('CAPTCHA provider in use.'),
      ajax: z.boolean().describe('Whether AJAX submission is enabled.'),
      submissionCount: z.number().describe('Total submissions.'),
      spamCount: z.number().describe('Total spam submissions.'),
      createdAt: z.string().describe('Form creation timestamp.'),
      updatedAt: z.string().describe('Form last updated timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let f = await client.getForm(ctx.input.formId);

    let output = {
      formId: f.id,
      uuid: f.uuid ?? '',
      name: f.name ?? '',
      enabled: f.enabled ?? true,
      endpointUrl: f.endpoint_url ?? '',
      projectId: f.project_id ?? null,
      redirectUrl: f.redirect_url ?? null,
      notificationEmails: f.notification_emails ?? null,
      honeypotField: f.honeypot_field ?? null,
      captchaProvider: f.captcha_provider ?? null,
      ajax: f.ajax ?? false,
      submissionCount: f.submission_count ?? 0,
      spamCount: f.spam_count ?? 0,
      createdAt: f.created_at ?? '',
      updatedAt: f.updated_at ?? ''
    };

    return {
      output,
      message: `Form **${output.name}** (ID: ${output.formId}) — ${output.submissionCount} submissions, ${output.spamCount} spam.`
    };
  })
  .build();
