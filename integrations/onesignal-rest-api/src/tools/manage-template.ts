import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateOutputSchema = z.object({
  templateId: z.string().optional().describe('Template UUID'),
  name: z.string().optional().describe('Template name'),
  channel: z.string().optional().describe('Template channel (push, email, sms)'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  contents: z
    .record(z.string(), z.string())
    .optional()
    .describe('Localized push body content'),
  headings: z.record(z.string(), z.string()).optional().describe('Localized push title'),
  emailSubject: z.string().optional().describe('Email subject'),
  emailBody: z.string().optional().describe('HTML email body')
});

let mapTemplate = (t: any) => ({
  templateId: t.id,
  name: t.name,
  channel: t.channel,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
  contents: t.contents,
  headings: t.headings,
  emailSubject: t.email_subject,
  emailBody: t.email_body
});

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a reusable message template for push notifications, emails, or SMS. Templates simplify sending consistent messages across campaigns.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Template name'),
      contents: z
        .record(z.string(), z.string())
        .optional()
        .describe('Localized push body, e.g. {"en": "Hello {{name}}!"}'),
      headings: z.record(z.string(), z.string()).optional().describe('Localized push title'),
      emailSubject: z.string().optional().describe('Email subject line'),
      emailBody: z.string().optional().describe('HTML email content'),
      isEmail: z.boolean().optional().describe('Set true for email templates'),
      isSms: z.boolean().optional().describe('Set true for SMS templates')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.contents) body.contents = ctx.input.contents;
    if (ctx.input.headings) body.headings = ctx.input.headings;
    if (ctx.input.emailSubject) body.email_subject = ctx.input.emailSubject;
    if (ctx.input.emailBody) body.email_body = ctx.input.emailBody;
    if (ctx.input.isEmail !== undefined) body.isEmail = ctx.input.isEmail;
    if (ctx.input.isSms !== undefined) body.isSMS = ctx.input.isSms;

    let result = await client.createTemplate(body);

    return {
      output: mapTemplate(result),
      message: `Template **${ctx.input.name}** created${result.id ? ` with ID **${result.id}**` : ''}.`
    };
  })
  .build();

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve all message templates with optional channel filtering and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channel: z.enum(['push', 'email', 'sms']).optional().describe('Filter by channel type'),
      limit: z.number().optional().describe('Number of templates to return (default 50)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      templates: z.array(templateOutputSchema).describe('List of templates'),
      totalCount: z.number().optional().describe('Total number of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let result = await client.listTemplates({
      channel: ctx.input.channel,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let templates = (result.templates || []).map(mapTemplate);

    return {
      output: {
        templates,
        totalCount: result.total_count
      },
      message: `Found **${result.total_count ?? templates.length}** template(s).`
    };
  })
  .build();

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve the full details of a specific template by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Template ID to retrieve')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let result = await client.getTemplate(ctx.input.templateId);

    return {
      output: mapTemplate(result),
      message: `Retrieved template **${result.name || ctx.input.templateId}**.`
    };
  })
  .build();

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update an existing template's name, content, or other properties.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Template ID to update'),
      name: z.string().describe('Updated template name'),
      contents: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated localized push body'),
      headings: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated localized push title'),
      emailSubject: z.string().optional().describe('Updated email subject'),
      emailBody: z.string().optional().describe('Updated HTML email body')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.contents) body.contents = ctx.input.contents;
    if (ctx.input.headings) body.headings = ctx.input.headings;
    if (ctx.input.emailSubject) body.email_subject = ctx.input.emailSubject;
    if (ctx.input.emailBody) body.email_body = ctx.input.emailBody;

    let result = await client.updateTemplate(ctx.input.templateId, body);

    return {
      output: mapTemplate(result),
      message: `Template **${ctx.input.templateId}** updated.`
    };
  })
  .build();

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Delete a message template. Templates used in active Journeys cannot be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Template ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let result = await client.deleteTemplate(ctx.input.templateId);

    return {
      output: {
        success: result.success === true
      },
      message: result.success
        ? `Template **${ctx.input.templateId}** deleted.`
        : `Failed to delete template **${ctx.input.templateId}**.`
    };
  })
  .build();
