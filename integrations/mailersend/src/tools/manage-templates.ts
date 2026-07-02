import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve a paginated list of email templates. Optionally filter by domain.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z.string().optional().describe('Filter templates by domain ID.'),
      page: z.number().optional().describe('Page number for pagination.'),
      limit: z
        .number()
        .min(10)
        .max(100)
        .optional()
        .describe('Results per page (10-100, default 25).')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Template ID.'),
            name: z.string().describe('Template name.'),
            type: z.string().describe('Template type.'),
            imagePath: z.string().nullable().describe('Template preview image URL.'),
            createdAt: z.string().describe('Creation timestamp.')
          })
        )
        .describe('List of templates.'),
      total: z.number().describe('Total number of templates.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTemplates({
      domainId: ctx.input.domainId,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let templates = (result.data || []).map((t: Record<string, unknown>) => ({
      templateId: String(t.id || ''),
      name: String(t.name || ''),
      type: String(t.type || ''),
      imagePath: t.image_path ? String(t.image_path) : null,
      createdAt: String(t.created_at || '')
    }));

    let total =
      ((result.meta as Record<string, unknown>)?.total as number) ?? templates.length;

    return {
      output: { templates, total },
      message: `Found **${total}** templates. Showing ${templates.length} on this page.`
    };
  })
  .build();

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve detailed information about a specific email template, including personalization settings and statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to retrieve.')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Template ID.'),
      name: z.string().describe('Template name.'),
      type: z.string().describe('Template type.'),
      imagePath: z.string().nullable().describe('Template preview image URL.'),
      createdAt: z.string().describe('Creation timestamp.'),
      templateData: z
        .record(z.string(), z.unknown())
        .describe('Full template data including stats and domain info.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getTemplate(ctx.input.templateId);
    let t = result.data;

    return {
      output: {
        templateId: String(t.id || ''),
        name: String(t.name || ''),
        type: String(t.type || ''),
        imagePath: t.image_path ? String(t.image_path) : null,
        createdAt: String(t.created_at || ''),
        templateData: t
      },
      message: `Retrieved template **${t.name}** (\`${t.id}\`).`
    };
  })
  .build();

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Permanently delete an email template. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the template was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTemplate(ctx.input.templateId);

    return {
      output: { deleted: true },
      message: `Template \`${ctx.input.templateId}\` deleted successfully.`
    };
  })
  .build();
