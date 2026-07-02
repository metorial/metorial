import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateBodySchema = z
  .object({
    html: z.string().optional().describe('HTML email body'),
    plaintext: z.string().optional().describe('Plaintext email body'),
    amp: z.string().optional().describe('AMP HTML email body')
  })
  .optional()
  .describe('Email body content (at least one format required for creation)');

let attachmentSchema = z.object({
  type: z.string().describe('MIME type'),
  name: z.string().describe('Filename'),
  content: z.string().describe('Base64-encoded content')
});

let templateOutputSchema = z.object({
  templateId: z.string().describe('UUID of the template'),
  name: z.string().optional().describe('Template name'),
  subject: z.string().optional().describe('Email subject'),
  fromEmail: z.string().optional().describe('Sender email'),
  fromName: z.string().optional().describe('Sender name'),
  templateEngine: z.string().optional().describe('Template engine used'),
  created: z.string().optional().describe('Creation timestamp')
});

// ── Create/Update Template ──

export let upsertTemplate = SlateTool.create(spec, {
  name: 'Create or Update Template',
  key: 'upsert_template',
  description: `Create a new email template or update an existing one. Templates store reusable email content including body, subject, sender info, and attachments. When sending emails, reference a template by ID to pre-fill fields.
To update an existing template, provide its **templateId**. To create a new template, omit the templateId.`,
  constraints: ['Maximum 10,000 templates per project.'],
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
        .describe('Template UUID (provide to update existing, omit to create new)'),
      name: z.string().optional().describe('Template name'),
      subject: z.string().optional().describe('Email subject line'),
      fromEmail: z.string().optional().describe('Sender email address'),
      fromName: z.string().optional().describe('Sender display name'),
      replyTo: z.string().optional().describe('Reply-to email address'),
      replyToName: z.string().optional().describe('Reply-to display name'),
      body: templateBodySchema,
      templateEngine: z
        .enum(['simple', 'velocity', 'liquid', 'none'])
        .optional()
        .describe('Template engine for substitutions'),
      editorType: z.enum(['html', 'visual']).optional().describe('Editor type'),
      globalSubstitutions: z
        .record(z.string(), z.string())
        .optional()
        .describe('Default substitution values'),
      globalMetadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Default metadata key-value pairs'),
      trackLinks: z.boolean().optional().describe('Enable click tracking'),
      trackRead: z.boolean().optional().describe('Enable open/read tracking'),
      headers: z.record(z.string(), z.string()).optional().describe('Custom email headers'),
      attachments: z.array(attachmentSchema).optional().describe('File attachments'),
      inlineAttachments: z
        .array(attachmentSchema)
        .optional()
        .describe('Inline image attachments')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let template: Record<string, unknown> = {};
    if (ctx.input.templateId) template.id = ctx.input.templateId;
    if (ctx.input.name) template.name = ctx.input.name;
    if (ctx.input.subject) template.subject = ctx.input.subject;
    if (ctx.input.fromEmail) template.from_email = ctx.input.fromEmail;
    if (ctx.input.fromName) template.from_name = ctx.input.fromName;
    if (ctx.input.replyTo) template.reply_to = ctx.input.replyTo;
    if (ctx.input.replyToName) template.reply_to_name = ctx.input.replyToName;
    if (ctx.input.body) template.body = ctx.input.body;
    if (ctx.input.templateEngine) template.template_engine = ctx.input.templateEngine;
    if (ctx.input.editorType) template.editor_type = ctx.input.editorType;
    if (ctx.input.globalSubstitutions)
      template.global_substitutions = ctx.input.globalSubstitutions;
    if (ctx.input.globalMetadata) template.global_metadata = ctx.input.globalMetadata;
    if (ctx.input.trackLinks !== undefined)
      template.track_links = ctx.input.trackLinks ? 1 : 0;
    if (ctx.input.trackRead !== undefined) template.track_read = ctx.input.trackRead ? 1 : 0;
    if (ctx.input.headers) template.headers = ctx.input.headers;
    if (ctx.input.attachments) template.attachments = ctx.input.attachments;
    if (ctx.input.inlineAttachments) template.inline_attachments = ctx.input.inlineAttachments;

    let result = await client.setTemplate(template as any);
    let t = result.template;

    let isUpdate = !!ctx.input.templateId;

    return {
      output: {
        templateId: (t.id ?? ctx.input.templateId) as string,
        name: t.name,
        subject: t.subject,
        fromEmail: t.from_email,
        fromName: t.from_name,
        templateEngine: t.template_engine
      },
      message: isUpdate
        ? `Template **${t.name ?? ctx.input.templateId}** updated successfully.`
        : `Template **${t.name ?? t.id}** created successfully.`
    };
  })
  .build();

// ── Get Template ──

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve a single email template by its ID. Returns the full template configuration including body, subject, sender info, and all settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('UUID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('UUID of the template'),
      name: z.string().optional().describe('Template name'),
      subject: z.string().optional().describe('Email subject'),
      fromEmail: z.string().optional().describe('Sender email'),
      fromName: z.string().optional().describe('Sender name'),
      replyTo: z.string().optional().describe('Reply-to email'),
      templateEngine: z.string().optional().describe('Template engine'),
      editorType: z.string().optional().describe('Editor type'),
      body: z
        .object({
          html: z.string().optional(),
          plaintext: z.string().optional(),
          amp: z.string().optional()
        })
        .optional()
        .describe('Email body content'),
      globalSubstitutions: z
        .record(z.string(), z.string())
        .optional()
        .describe('Default substitutions'),
      globalMetadata: z.record(z.string(), z.string()).optional().describe('Default metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.getTemplate(ctx.input.templateId);
    let t = result.template;

    return {
      output: {
        templateId: t.id ?? ctx.input.templateId,
        name: t.name,
        subject: t.subject,
        fromEmail: t.from_email,
        fromName: t.from_name,
        replyTo: t.reply_to,
        templateEngine: t.template_engine,
        editorType: t.editor_type,
        body: t.body,
        globalSubstitutions: t.global_substitutions,
        globalMetadata: t.global_metadata
      },
      message: `Retrieved template **${t.name ?? ctx.input.templateId}**.`
    };
  })
  .build();

// ── List Templates ──

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all email templates in the account or project. Returns template metadata including name, subject, sender, and creation date. Supports pagination via limit and offset.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of templates to return (default: 50)'),
      offset: z.number().optional().describe('Number of templates to skip for pagination')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Template UUID'),
            name: z.string().describe('Template name'),
            subject: z.string().optional().describe('Email subject'),
            fromEmail: z.string().optional().describe('Sender email'),
            fromName: z.string().optional().describe('Sender name'),
            templateEngine: z.string().optional().describe('Template engine'),
            created: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.listTemplates({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let templates = (result.templates ?? []).map(t => ({
      templateId: t.id,
      name: t.name,
      subject: t.subject,
      fromEmail: t.from_email,
      fromName: t.from_name,
      templateEngine: t.template_engine,
      created: t.created
    }));

    return {
      output: { templates },
      message: `Found **${templates.length}** templates.`
    };
  })
  .build();

// ── Delete Template ──

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Delete an email template by its ID. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('UUID of the template to delete')
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
      datacenter: ctx.config.datacenter
    });

    let result = await client.deleteTemplate(ctx.input.templateId);

    return {
      output: { success: result.status === 'success' },
      message: `Template **${ctx.input.templateId}** deleted.`
    };
  })
  .build();
