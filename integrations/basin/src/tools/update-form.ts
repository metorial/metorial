import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateForm = SlateTool.create(spec, {
  name: 'Update Form',
  key: 'update_form',
  description: `Update an existing form endpoint's settings. Supports updating name, redirect URL, notification emails, spam protection, CAPTCHA settings, and more.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      formId: z.number().describe('ID of the form to update.'),
      name: z.string().optional().describe('New name for the form.'),
      enabled: z.boolean().optional().describe('Enable or disable the form.'),
      redirectUrl: z.string().optional().describe('Custom redirect URL after submission.'),
      notificationEmails: z
        .string()
        .optional()
        .describe('Comma-separated notification email addresses.'),
      notifyEmailSubject: z.string().optional().describe('Custom email notification subject.'),
      honeypotField: z
        .string()
        .optional()
        .describe('Honeypot field name for spam protection.'),
      captchaProvider: z
        .string()
        .optional()
        .describe('CAPTCHA provider (e.g., "hcaptcha", "recaptcha", "turnstile").'),
      ajax: z.boolean().optional().describe('Whether this form will be submitted via AJAX.'),
      projectId: z.number().optional().describe('Project ID to associate this form with.'),
      timezone: z.string().optional().describe('Timezone for the form.')
    })
  )
  .output(
    z.object({
      formId: z.number().describe('ID of the updated form.'),
      name: z.string().describe('Name of the form.'),
      enabled: z.boolean().describe('Whether the form is enabled.'),
      endpointUrl: z.string().describe('Basin endpoint URL for form submissions.'),
      updatedAt: z.string().describe('Last updated timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateData: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.enabled !== undefined) updateData.enabled = ctx.input.enabled;
    if (ctx.input.redirectUrl !== undefined) updateData.redirect_url = ctx.input.redirectUrl;
    if (ctx.input.notificationEmails !== undefined)
      updateData.notification_emails = ctx.input.notificationEmails;
    if (ctx.input.notifyEmailSubject !== undefined)
      updateData.notify_email_subject = ctx.input.notifyEmailSubject;
    if (ctx.input.honeypotField !== undefined)
      updateData.honeypot_field = ctx.input.honeypotField;
    if (ctx.input.captchaProvider !== undefined)
      updateData.captcha_provider = ctx.input.captchaProvider;
    if (ctx.input.ajax !== undefined) updateData.ajax = ctx.input.ajax;
    if (ctx.input.projectId !== undefined) updateData.project_id = ctx.input.projectId;
    if (ctx.input.timezone !== undefined) updateData.timezone = ctx.input.timezone;

    let form = await client.updateForm(ctx.input.formId, updateData);

    return {
      output: {
        formId: form.id,
        name: form.name ?? '',
        enabled: form.enabled ?? true,
        endpointUrl: form.endpoint_url ?? '',
        updatedAt: form.updated_at ?? ''
      },
      message: `Updated form **${form.name}** (ID: ${form.id}).`
    };
  })
  .build();
