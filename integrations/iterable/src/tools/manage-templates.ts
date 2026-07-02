import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { spec } from '../spec';

export let manageTemplates = SlateTool.create(spec, {
  name: 'Manage Templates',
  key: 'manage_templates',
  description: `List, retrieve, or update message templates across all channels (email, push, SMS, in-app). Templates use Handlebars-based personalization with user profile and event data.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'update'])
        .describe(
          'Operation: list templates, get a specific template, or update an email template'
        ),
      templateType: z
        .string()
        .optional()
        .describe(
          'Filter by template type when listing (e.g., "Base", "Blast", "Triggered", "Workflow")'
        ),
      messageMedium: z
        .enum(['Email', 'Push', 'SMS', 'InApp'])
        .optional()
        .describe('Filter by channel when listing, or channel type when getting a template'),
      templateId: z.number().optional().describe('Template ID (required for get and update)'),
      name: z.string().optional().describe('New name for the email template (for update)'),
      fromName: z.string().optional().describe('Sender name (for email update)'),
      fromEmail: z.string().optional().describe('Sender email address (for email update)'),
      replyToEmail: z
        .string()
        .optional()
        .describe('Reply-to email address (for email update)'),
      subject: z.string().optional().describe('Email subject line (for email update)'),
      preheaderText: z.string().optional().describe('Email preheader text (for email update)'),
      html: z.string().optional().describe('HTML body content (for email update)'),
      plainText: z.string().optional().describe('Plain text body content (for email update)')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.number().describe('Template ID'),
            name: z.string().optional().describe('Template name'),
            templateType: z.string().optional().describe('Template type'),
            messageMedium: z.string().optional().describe('Channel type'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('List of templates'),
      template: z.record(z.string(), z.any()).optional().describe('Full template details'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    if (ctx.input.action === 'list') {
      let result = await client.getTemplates({
        templateType: ctx.input.templateType,
        messageMedium: ctx.input.messageMedium
      });
      let templates = (result.templates || []).map((t: any) => ({
        templateId: t.templateId,
        name: t.name,
        templateType: t.templateType,
        messageMedium: t.messageMedium,
        createdAt: t.createdAt ? String(t.createdAt) : undefined,
        updatedAt: t.updatedAt ? String(t.updatedAt) : undefined
      }));
      return {
        output: {
          templates,
          message: `Found ${templates.length} template(s).`
        },
        message: `Retrieved **${templates.length}** template(s).`
      };
    }

    if (ctx.input.action === 'get') {
      let template: any;
      let medium = ctx.input.messageMedium || 'Email';
      switch (medium) {
        case 'Push':
          template = await client.getPushTemplate(ctx.input.templateId!);
          break;
        case 'SMS':
          template = await client.getSmsTemplate(ctx.input.templateId!);
          break;
        case 'InApp':
          template = await client.getInAppTemplate(ctx.input.templateId!);
          break;
        default:
          template = await client.getEmailTemplate(ctx.input.templateId!);
          break;
      }
      return {
        output: {
          template,
          message: `Retrieved ${medium} template ${ctx.input.templateId}.`
        },
        message: `Retrieved **${medium}** template **${ctx.input.templateId}**.`
      };
    }

    // update (email only via API)
    let result = await client.updateEmailTemplate({
      templateId: ctx.input.templateId!,
      name: ctx.input.name,
      fromName: ctx.input.fromName,
      fromEmail: ctx.input.fromEmail,
      replyToEmail: ctx.input.replyToEmail,
      subject: ctx.input.subject,
      preheaderText: ctx.input.preheaderText,
      html: ctx.input.html,
      plainText: ctx.input.plainText
    });
    return {
      output: {
        message: result.msg || `Email template ${ctx.input.templateId} updated.`
      },
      message: `Updated email template **${ctx.input.templateId}**.`
    };
  })
  .build();
