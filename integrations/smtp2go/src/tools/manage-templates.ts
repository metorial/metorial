import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateSchema = z.object({
  templateId: z.string().describe('Template ID'),
  templateName: z.string().describe('Template name'),
  subject: z.string().optional().describe('Default subject'),
  sender: z.string().optional().describe('Default sender address'),
  htmlBody: z.string().optional().describe('HTML body content'),
  textBody: z.string().optional().describe('Plain text body content')
});

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Email Template',
  key: 'create_template',
  description: `Create a new email template. Templates support personalization variables using Handlebars syntax (e.g. \`{{ variableName }}\`) that are populated when sending via the API.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateName: z.string().describe('Name for the template'),
      htmlBody: z
        .string()
        .optional()
        .describe('HTML body content with optional Handlebars variables'),
      textBody: z.string().optional().describe('Plain text body content'),
      subject: z.string().optional().describe('Default subject line'),
      sender: z.string().optional().describe('Default sender email address')
    })
  )
  .output(templateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.addTemplate(ctx.input);
    let data = result.data || result;

    return {
      output: {
        templateId: data.template_id ?? '',
        templateName: data.template_name ?? ctx.input.templateName,
        subject: data.subject,
        sender: data.sender,
        htmlBody: data.html_body,
        textBody: data.text_body
      },
      message: `Template **"${ctx.input.templateName}"** created successfully.`
    };
  })
  .build();

export let editTemplate = SlateTool.create(spec, {
  name: 'Edit Email Template',
  key: 'edit_template',
  description: `Update an existing email template. Only the fields provided will be changed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to edit'),
      templateName: z.string().optional().describe('New template name'),
      htmlBody: z.string().optional().describe('Updated HTML body content'),
      textBody: z.string().optional().describe('Updated plain text body content'),
      subject: z.string().optional().describe('Updated default subject line'),
      sender: z.string().optional().describe('Updated default sender email address')
    })
  )
  .output(templateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.editTemplate(ctx.input);
    let data = result.data || result;

    return {
      output: {
        templateId: data.template_id ?? ctx.input.templateId,
        templateName: data.template_name ?? '',
        subject: data.subject,
        sender: data.sender,
        htmlBody: data.html_body,
        textBody: data.text_body
      },
      message: `Template **${ctx.input.templateId}** updated successfully.`
    };
  })
  .build();

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Email Template',
  key: 'delete_template',
  description: `Permanently delete an email template by its ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to delete')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the deleted template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteTemplate(ctx.input);

    return {
      output: {
        templateId: ctx.input.templateId
      },
      message: `Template **${ctx.input.templateId}** deleted.`
    };
  })
  .build();

export let searchTemplates = SlateTool.create(spec, {
  name: 'Search Email Templates',
  key: 'search_templates',
  description: `Search and list email templates. Optionally filter by name. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateName: z.string().optional().describe('Filter templates by name'),
      limit: z.number().optional().describe('Maximum number of results'),
      continueToken: z.string().optional().describe('Continuation token for pagination')
    })
  )
  .output(
    z.object({
      templates: z.array(templateSchema).describe('Matching templates'),
      continueToken: z.string().optional().describe('Token for fetching next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.searchTemplates(ctx.input);
    let data = result.data || result;

    let templates = (data.templates || []).map((t: any) => ({
      templateId: t.template_id ?? '',
      templateName: t.template_name ?? '',
      subject: t.subject,
      sender: t.sender,
      htmlBody: t.html_body,
      textBody: t.text_body
    }));

    return {
      output: {
        templates,
        continueToken: data.continue_token
      },
      message: `Found **${templates.length}** template(s).`
    };
  })
  .build();

export let viewTemplate = SlateTool.create(spec, {
  name: 'View Email Template',
  key: 'view_template',
  description: `Retrieve the full details of a specific email template by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to view')
    })
  )
  .output(templateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.viewTemplate(ctx.input);
    let data = result.data || result;

    return {
      output: {
        templateId: data.template_id ?? ctx.input.templateId,
        templateName: data.template_name ?? '',
        subject: data.subject,
        sender: data.sender,
        htmlBody: data.html_body,
        textBody: data.text_body
      },
      message: `Template **"${data.template_name ?? ctx.input.templateId}"** retrieved.`
    };
  })
  .build();
