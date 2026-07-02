import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageTemplates = SlateTool.create(spec, {
  name: 'Manage Email Templates',
  key: 'manage_templates',
  description: `Create, update, or delete reusable email templates. Templates can be used when composing email messages for campaigns.
Use **action** to specify the operation.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      templateId: z
        .number()
        .optional()
        .describe('Template ID (required for update and delete)'),
      title: z.string().optional().describe('Template title (required for create)'),
      subject: z.string().optional().describe('Default subject line for the template'),
      body: z.string().optional().describe('HTML body of the template'),
      textBody: z.string().optional().describe('Plain text version of the template'),
      templateLang: z.string().optional().describe('Template language code'),
      description: z.string().optional().describe('Template description'),
      listId: z.number().optional().describe('Default list ID for the template')
    })
  )
  .output(
    z.object({
      templateId: z.number().optional().describe('ID of the created or updated template'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.title) throw new Error('Title is required when creating a template');
      let result = await client.createEmailTemplate({
        title: ctx.input.title,
        subject: ctx.input.subject,
        body: ctx.input.body,
        text_body: ctx.input.textBody,
        lang: ctx.input.templateLang,
        description: ctx.input.description,
        list_id: ctx.input.listId
      });
      return {
        output: { templateId: result.template_id, success: true },
        message: `Created template **"${ctx.input.title}"** with ID \`${result.template_id}\``
      };
    }

    if (action === 'update') {
      if (!ctx.input.templateId)
        throw new Error('templateId is required when updating a template');
      await client.updateEmailTemplate({
        template_id: ctx.input.templateId,
        title: ctx.input.title,
        subject: ctx.input.subject,
        body: ctx.input.body,
        text_body: ctx.input.textBody,
        lang: ctx.input.templateLang,
        description: ctx.input.description,
        list_id: ctx.input.listId
      });
      return {
        output: { templateId: ctx.input.templateId, success: true },
        message: `Updated template \`${ctx.input.templateId}\``
      };
    }

    if (action === 'delete') {
      if (!ctx.input.templateId)
        throw new Error('templateId is required when deleting a template');
      await client.deleteTemplate(ctx.input.templateId);
      return {
        output: { templateId: ctx.input.templateId, success: true },
        message: `Deleted template \`${ctx.input.templateId}\``
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
