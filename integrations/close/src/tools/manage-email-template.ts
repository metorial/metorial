import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let isUpdate = !!ctx.input.templateId;
    let result: any;

    if (isUpdate) {
      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.subject !== undefined) updateData.subject = ctx.input.subject;
      if (ctx.input.body !== undefined) updateData.body = ctx.input.body;
      if (ctx.input.isArchived !== undefined) updateData.is_archived = ctx.input.isArchived;

      result = await client.updateEmailTemplate(ctx.input.templateId!, updateData);
    } else {
      if (!ctx.input.name) {
        throw new Error('name is required when creating a new email template');
      }

      let createData: Record<string, any> = {
        name: ctx.input.name
      };
      if (ctx.input.subject !== undefined) createData.subject = ctx.input.subject;
      if (ctx.input.body !== undefined) createData.body = ctx.input.body;
      if (ctx.input.isArchived !== undefined) createData.is_archived = ctx.input.isArchived;

      result = await client.createEmailTemplate(createData);
    }

    return {
      output: {
        templateId: result.id,
        name: result.name,
        subject: result.subject,
        body: result.body,
        isArchived: result.is_archived ?? false,
        dateCreated: result.date_created,
        dateUpdated: result.date_updated
      },
      message: isUpdate
        ? `Updated email template \`${result.id}\` ("${result.name}").`
        : `Created email template \`${result.id}\` ("${result.name}").`
    };
  })
  .build();
