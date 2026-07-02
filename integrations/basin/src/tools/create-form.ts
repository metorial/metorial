import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createForm = SlateTool.create(spec, {
  name: 'Create Form',
  key: 'create_form',
  description: `Create a new form endpoint in Basin. The form will have a unique URL where HTML forms can send submissions. Returns the created form with its endpoint URL.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new form.'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for the form (e.g., "America/New_York").'),
      notificationEmails: z
        .string()
        .optional()
        .describe('Comma-separated email addresses for submission notifications.'),
      projectId: z.number().optional().describe('Project ID to associate this form with.'),
      redirectUrl: z
        .string()
        .optional()
        .describe('Custom URL to redirect users after submission. Requires a paid plan.'),
      honeypotField: z
        .string()
        .optional()
        .describe('Hidden honeypot field name for spam protection.'),
      ajax: z.boolean().optional().describe('Whether this form will be submitted via AJAX.')
    })
  )
  .output(
    z.object({
      formId: z.number().describe('ID of the created form.'),
      uuid: z.string().describe('UUID of the created form.'),
      name: z.string().describe('Name of the form.'),
      endpointUrl: z.string().describe('The unique Basin endpoint URL for form submissions.'),
      enabled: z.boolean().describe('Whether the form is enabled.'),
      createdAt: z.string().describe('Creation timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let form = await client.createForm({
      name: ctx.input.name,
      timezone: ctx.input.timezone,
      notification_emails: ctx.input.notificationEmails,
      project_id: ctx.input.projectId,
      redirect_url: ctx.input.redirectUrl,
      honeypot_field: ctx.input.honeypotField,
      ajax: ctx.input.ajax
    });

    return {
      output: {
        formId: form.id,
        uuid: form.uuid ?? '',
        name: form.name ?? '',
        endpointUrl: form.endpoint_url ?? '',
        enabled: form.enabled ?? true,
        createdAt: form.created_at ?? ''
      },
      message: `Created form **${form.name}** (ID: ${form.id}). Endpoint: ${form.endpoint_url}`
    };
  })
  .build();
