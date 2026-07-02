import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTemplate = SlateTool.create(spec, {
  name: 'Manage Template',
  key: 'manage_template',
  description: `List, retrieve, update, or delete email templates (canned responses). Templates help maintain consistent messaging and save time on repetitive replies.`
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'update', 'delete']).describe('The operation to perform'),
      templateId: z
        .string()
        .optional()
        .describe('Template ID (required for get, update, delete)'),
      name: z.string().optional().describe('Template name (for update)'),
      subject: z.string().optional().describe('Template subject (for update)'),
      body: z.string().optional().describe('Template body content (for update)')
    })
  )
  .output(
    z.object({
      templates: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of templates (for list action)'),
      template: z
        .record(z.string(), z.any())
        .optional()
        .describe('Template details (for get, update)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, templateId, name, subject, body } = ctx.input;

    if (action === 'list') {
      let result = await client.listTemplates();
      let templates = Array.isArray(result) ? result : (result.templates ?? result.data ?? []);
      return {
        output: { templates, success: true },
        message: `Retrieved ${templates.length} template(s).`
      };
    }

    if (action === 'get') {
      if (!templateId) throw new Error('templateId is required for get action');
      let template = await client.getTemplate(templateId);
      return {
        output: { template, success: true },
        message: `Retrieved template **${templateId}**.`
      };
    }

    if (action === 'update') {
      if (!templateId) throw new Error('templateId is required for update action');
      let updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (subject !== undefined) updateData.subject = subject;
      if (body !== undefined) updateData.body = body;
      let template = await client.updateTemplate(templateId, updateData);
      return {
        output: { template, success: true },
        message: `Updated template **${templateId}**.`
      };
    }

    if (action === 'delete') {
      if (!templateId) throw new Error('templateId is required for delete action');
      await client.deleteTemplate(templateId);
      return {
        output: { success: true },
        message: `Deleted template **${templateId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
