import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateSchema = z.object({
  templateId: z.string().describe('Unique ID of the template'),
  name: z.string().describe('Name of the template'),
  message: z.string().optional().describe('Message content of the template'),
  categoryId: z.string().optional().describe('Category the template belongs to')
});

export let manageTemplates = SlateTool.create(spec, {
  name: 'Manage Templates',
  key: 'manage_templates',
  description: `Create, update, delete, or list message templates. Templates store reusable message content for common outreach scenarios such as thank-you notes, birthday cards, etc.`,
  instructions: [
    'To list: set action to "list". Optionally filter by categoryId.',
    'To get details: set action to "get" and provide templateId.',
    'To create: set action to "create" and provide name and message.',
    'To update: set action to "update" and provide templateId plus fields to change.',
    'To delete: set action to "delete" and provide templateId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      templateId: z
        .string()
        .optional()
        .describe('Template ID (required for get, update, delete)'),
      categoryId: z.string().optional().describe('Filter templates by category ID (for list)'),
      name: z.string().optional().describe('Template name (for create/update)'),
      message: z.string().optional().describe('Template message content (for create/update)')
    })
  )
  .output(
    z.object({
      templates: z
        .array(templateSchema)
        .optional()
        .describe('List of templates (for list action)'),
      template: templateSchema.optional().describe('Template details (for get/create/update)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    let mapTemplate = (t: any) => ({
      templateId: String(t.id ?? t.template_id),
      name: t.name ?? '',
      message: t.message ?? undefined,
      categoryId: t.category_id != null ? String(t.category_id) : undefined
    });

    if (action === 'list') {
      let result = await client.listTemplates(ctx.input.categoryId);
      let templates = (result.templates ?? []).map(mapTemplate);
      return {
        output: { templates, success: true },
        message: `Found **${templates.length}** templates.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.templateId) throw new Error('templateId is required for get action');
      let result = await client.getTemplate(ctx.input.templateId);
      let template = mapTemplate(result.template ?? result);
      return {
        output: { template, success: true },
        message: `Retrieved template **${template.name}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.message) {
        throw new Error('name and message are required to create a template');
      }
      let result = await client.createTemplate(ctx.input.name, ctx.input.message);
      let templateId = String(result.template_id ?? result.id ?? '');
      return {
        output: {
          template: { templateId, name: ctx.input.name, message: ctx.input.message },
          success: true
        },
        message: `Created template **${ctx.input.name}** with ID \`${templateId}\`.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.templateId) throw new Error('templateId is required for update action');
      let result = await client.updateTemplate(ctx.input.templateId, {
        name: ctx.input.name,
        message: ctx.input.message
      });
      let template = result.template
        ? mapTemplate(result.template)
        : {
            templateId: ctx.input.templateId,
            name: ctx.input.name ?? '',
            message: ctx.input.message ?? undefined
          };
      return {
        output: { template, success: true },
        message: `Updated template \`${ctx.input.templateId}\`.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.templateId) throw new Error('templateId is required for delete action');
      await client.deleteTemplate(ctx.input.templateId);
      return {
        output: { success: true },
        message: `Deleted template \`${ctx.input.templateId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
