import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nonEmpty } from '../lib/client';
import { spec } from '../spec';

export let manageEmailTemplate = SlateTool.create(spec, {
  name: 'Manage Email Template',
  key: 'manage_email_template',
  description: `Create or update an email template in Close CRM. If a templateId is provided the existing template is updated; otherwise a new template is created.`,
  instructions: [
    'To **create** a template, provide at minimum a **name**. Optionally include **subject** and **body** (HTML).',
    'To **update** a template, provide **templateId** and the fields to change.',
    'Set **isArchived** to true to archive a template, or false to restore it.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z
        .string()
        .optional()
        .describe('Template ID to update. If omitted, a new template is created.'),
      name: z
        .string()
        .optional()
        .describe('Template name (required when creating a new template)'),
      subject: z.string().optional().describe('Email subject line for the template'),
      body: z.string().optional().describe('Email body in HTML format for the template'),
      isArchived: z.boolean().optional().describe('Whether the template is archived')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique identifier of the email template'),
      name: z.string().describe('Template name'),
      subject: z.string().optional().describe('Email subject line'),
      body: z.string().optional().describe('Email body in HTML format'),
      isArchived: z.boolean().describe('Whether the template is archived'),
      dateCreated: z.string().describe('ISO 8601 timestamp when the template was created'),
      dateUpdated: z.string().describe('ISO 8601 timestamp when the template was last updated')
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input;
    if (input.templateId === undefined && input.name === undefined)
      throw createApiServiceError('name is required when creating an email template.');
    if (input.name !== undefined) nonEmpty(input.name, 'name');
    const body = pickDefined({
      name: input.name,
      subject: input.subject,
      body: input.body,
      is_archived: input.isArchived
    });
    const client = new Client(ctx.auth);
    const template =
      input.templateId !== undefined
        ? await client.updateEmailTemplate(input.templateId, body)
        : await client.createEmailTemplate(body);
    return {
      output: {
        templateId: template.id,
        name: template.name,
        subject: template.subject ?? undefined,
        body: template.body ?? undefined,
        isArchived: template.is_archived,
        dateCreated: template.date_created,
        dateUpdated: template.date_updated
      },
      message: `${input.templateId !== undefined ? 'Updated' : 'Created'} email template **${template.id}**.`
    };
  })
  .build();
