import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTemplates = SlateTool.create(spec, {
  name: 'Manage Templates',
  key: 'manage_templates',
  description: `List, get, create, update, or delete email templates on your Postmark server. Templates allow reusable HTML/CSS layouts with dynamic variables for consistent transactional and broadcast emails.`,
  instructions: [
    'Set **action** to "list", "get", "create", "update", or "delete".',
    'For "get", "update", and "delete", provide **templateId** (numeric) or **templateAlias** (string).'
  ],
  constraints: ['Maximum 100 templates per server.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Template operation to perform.'),
      templateId: z
        .number()
        .optional()
        .describe('Numeric template ID (for get/update/delete).'),
      templateAlias: z
        .string()
        .optional()
        .describe('Template alias string (for get/update/delete).'),
      name: z.string().optional().describe('Template name (for create/update).'),
      subject: z
        .string()
        .optional()
        .describe(
          'Template subject line with optional template variables (for create/update).'
        ),
      htmlBody: z
        .string()
        .optional()
        .describe('HTML body content with optional template variables (for create/update).'),
      textBody: z.string().optional().describe('Plain text body content (for create/update).'),
      alias: z.string().optional().describe('Alias for the template (for create/update).'),
      templateType: z
        .enum(['Standard', 'Layout'])
        .optional()
        .describe('Template type (for create). Defaults to "Standard".'),
      layoutTemplate: z
        .string()
        .optional()
        .describe('Alias of a layout template to use (for create/update).'),
      count: z
        .number()
        .min(1)
        .max(500)
        .default(100)
        .describe('Number of templates to return (for list).'),
      offset: z.number().min(0).default(0).describe('Offset for pagination (for list).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional().describe('Total templates (for list).'),
      templates: z
        .array(
          z.object({
            templateId: z.number().describe('Template ID.'),
            name: z.string().describe('Template name.'),
            active: z.boolean().describe('Whether the template is active.'),
            alias: z.string().nullable().describe('Template alias.'),
            templateType: z.string().describe('Template type.')
          })
        )
        .optional()
        .describe('List of templates (for list).'),
      template: z
        .object({
          templateId: z.number().describe('Template ID.'),
          name: z.string().describe('Template name.'),
          subject: z.string().describe('Template subject.'),
          htmlBody: z.string().describe('HTML body.'),
          textBody: z.string().describe('Text body.'),
          active: z.boolean().describe('Active status.'),
          alias: z.string().nullable().describe('Template alias.'),
          templateType: z.string().describe('Template type.')
        })
        .optional()
        .describe('Template details (for get/create/update).'),
      deleted: z.boolean().optional().describe('Whether the template was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    if (ctx.input.action === 'list') {
      let result = await client.listTemplates({
        count: ctx.input.count,
        offset: ctx.input.offset
      });

      return {
        output: {
          totalCount: result.TotalCount,
          templates: result.Templates.map(t => ({
            templateId: t.TemplateId,
            name: t.Name,
            active: t.Active,
            alias: t.Alias,
            templateType: t.TemplateType
          }))
        },
        message: `Found **${result.TotalCount}** templates (showing ${result.Templates.length}).`
      };
    }

    if (ctx.input.action === 'get') {
      let id = ctx.input.templateId ?? ctx.input.templateAlias;
      if (!id) throw new Error('templateId or templateAlias is required');

      let t = await client.getTemplate(id);

      return {
        output: {
          template: {
            templateId: t.TemplateId,
            name: t.Name,
            subject: t.Subject,
            htmlBody: t.HtmlBody,
            textBody: t.TextBody,
            active: t.Active,
            alias: t.Alias,
            templateType: t.TemplateType
          }
        },
        message: `Retrieved template **${t.Name}** (ID: ${t.TemplateId}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.subject) {
        throw new Error('name and subject are required for creating a template');
      }

      let t = await client.createTemplate({
        name: ctx.input.name,
        subject: ctx.input.subject,
        htmlBody: ctx.input.htmlBody,
        textBody: ctx.input.textBody,
        alias: ctx.input.alias,
        templateType: ctx.input.templateType,
        layoutTemplate: ctx.input.layoutTemplate
      });

      return {
        output: {
          template: {
            templateId: t.TemplateId,
            name: t.Name,
            subject: t.Subject,
            htmlBody: t.HtmlBody,
            textBody: t.TextBody,
            active: t.Active,
            alias: t.Alias,
            templateType: t.TemplateType
          }
        },
        message: `Created template **${t.Name}** (ID: ${t.TemplateId}).`
      };
    }

    if (ctx.input.action === 'update') {
      let id = ctx.input.templateId ?? ctx.input.templateAlias;
      if (!id) throw new Error('templateId or templateAlias is required');

      let t = await client.updateTemplate(id, {
        name: ctx.input.name,
        subject: ctx.input.subject,
        htmlBody: ctx.input.htmlBody,
        textBody: ctx.input.textBody,
        alias: ctx.input.alias,
        layoutTemplate: ctx.input.layoutTemplate
      });

      return {
        output: {
          template: {
            templateId: t.TemplateId,
            name: t.Name,
            subject: t.Subject,
            htmlBody: t.HtmlBody,
            textBody: t.TextBody,
            active: t.Active,
            alias: t.Alias,
            templateType: t.TemplateType
          }
        },
        message: `Updated template **${t.Name}** (ID: ${t.TemplateId}).`
      };
    }

    // delete
    let id = ctx.input.templateId ?? ctx.input.templateAlias;
    if (!id) throw new Error('templateId or templateAlias is required');

    await client.deleteTemplate(id);

    return {
      output: {
        deleted: true
      },
      message: `Deleted template **${id}**.`
    };
  });
