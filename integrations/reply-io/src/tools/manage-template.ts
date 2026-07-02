import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTemplate = SlateTool.create(spec, {
  name: 'Manage Template',
  key: 'manage_template',
  description: `Create, update, delete, or list email templates. Templates support variable placeholders like \`{{firstName}}\` for personalization.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      templateId: z
        .number()
        .optional()
        .describe('Template ID (required for get/update/delete)'),
      name: z.string().optional().describe('Template name (required for create)'),
      subject: z.string().optional().describe('Email subject line'),
      body: z
        .string()
        .optional()
        .describe('Email body content (HTML supported, use {{variable}} for personalization)'),
      categoryId: z.number().optional().describe('Category ID to organize the template')
    })
  )
  .output(
    z.object({
      template: z.record(z.string(), z.any()).optional().describe('Template details'),
      templates: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of templates'),
      deleted: z.boolean().optional().describe('Whether the template was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, templateId, name, subject, body, categoryId } = ctx.input;

    if (action === 'list') {
      let result = await client.listTemplates();
      let templates = Array.isArray(result) ? result : (result?.items ?? []);
      return {
        output: { templates },
        message: `Found **${templates.length}** template(s).`
      };
    }

    if (action === 'get') {
      if (!templateId) throw new Error('templateId is required');
      let template = await client.getTemplate(templateId);
      return {
        output: { template },
        message: `Retrieved template **${template.name ?? templateId}**.`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('name is required to create a template');
      let template = await client.createTemplate({ name, subject, body, categoryId });
      return {
        output: { template },
        message: `Created template **${template.name}** (ID: ${template.id}).`
      };
    }

    if (action === 'update') {
      if (!templateId) throw new Error('templateId is required');
      let data: Record<string, any> = {};
      if (name !== undefined) data.name = name;
      if (subject !== undefined) data.subject = subject;
      if (body !== undefined) data.body = body;
      if (categoryId !== undefined) data.categoryId = categoryId;

      let template = await client.updateTemplate(templateId, data);
      return {
        output: { template },
        message: `Updated template **${templateId}**.`
      };
    }

    // delete
    if (!templateId) throw new Error('templateId is required');
    await client.deleteTemplate(templateId);
    return {
      output: { deleted: true },
      message: `Deleted template **${templateId}**.`
    };
  })
  .build();
