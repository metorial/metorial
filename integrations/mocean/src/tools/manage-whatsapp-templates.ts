import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoceanClient } from '../lib/client';
import { spec } from '../spec';

let templateComponentSchema = z.object({
  type: z.enum(['HEADER', 'BODY', 'FOOTER', 'BUTTONS']).describe('Component type'),
  format: z
    .string()
    .optional()
    .describe('Header format: "TEXT", "IMAGE", "VIDEO", or "DOCUMENT"'),
  text: z.string().optional().describe('Component text content (may include {{1}} variables)'),
  example: z.any().optional().describe('Example values for variables'),
  buttons: z
    .array(
      z.object({
        type: z.string().describe('Button type: "QUICK_REPLY" or "URL"'),
        text: z.string().describe('Button label text'),
        url: z
          .string()
          .optional()
          .describe('URL for URL-type buttons (may include {{1}} variable)')
      })
    )
    .optional()
    .describe('Button definitions (for BUTTONS component)')
});

let templateOutputSchema = z.object({
  templateId: z.string().optional().describe('Template ID'),
  name: z.string().optional().describe('Template name'),
  language: z.string().optional().describe('Template language code'),
  category: z
    .string()
    .optional()
    .describe('Template category: MARKETING, UTILITY, or AUTHENTICATION'),
  status: z
    .string()
    .optional()
    .describe('Template approval status: APPROVED, PENDING, REJECTED, PAUSED'),
  components: z.array(z.any()).optional().describe('Template components')
});

export let manageWhatsAppTemplates = SlateTool.create(spec, {
  name: 'Manage WhatsApp Templates',
  key: 'manage_whatsapp_templates',
  description: `Create, list, retrieve, edit, or delete WhatsApp message templates. Templates are required for initiating WhatsApp conversations outside the 24-hour messaging window. Categories include **MARKETING**, **UTILITY**, and **AUTHENTICATION**.`,
  instructions: [
    'Use action "list" to browse templates, optionally filtering by name',
    'Use action "get" to retrieve a single template by ID',
    'Use action "create" to submit a new template for approval',
    'Use action "edit" to modify an existing template (approved templates limited to 1 edit/day, 10/month)',
    'Use action "delete" to remove a template by name and ID',
    'This tool requires API Key & Secret authentication (Basic Auth is used for template management)'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'edit', 'delete'])
        .describe('Operation to perform'),
      templateId: z
        .string()
        .optional()
        .describe('Template ID (required for "get", "edit", "delete")'),
      name: z
        .string()
        .optional()
        .describe(
          'Template name (required for "create", "edit", "delete"; optional filter for "list")'
        ),
      language: z
        .string()
        .optional()
        .describe('Language code (required for "create", e.g., "en")'),
      category: z
        .enum(['MARKETING', 'UTILITY', 'AUTHENTICATION'])
        .optional()
        .describe('Template category (required for "create")'),
      components: z
        .array(templateComponentSchema)
        .optional()
        .describe('Template components (required for "create", optional for "edit")'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of templates to return (for "list")')
    })
  )
  .output(
    z.object({
      template: templateOutputSchema
        .optional()
        .describe('Single template result (for get/create/edit)'),
      templates: z
        .array(templateOutputSchema)
        .optional()
        .describe('List of templates (for list)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the template was successfully deleted'),
      rawResponse: z.any().optional().describe('Raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoceanClient({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let mapTemplate = (t: any) => ({
      templateId: t.id,
      name: t.name,
      language: t.language,
      category: t.category,
      status: t.status,
      components: t.components
    });

    let input = ctx.input;

    if (input.action === 'list') {
      let result = await client.listTemplates({
        name: input.name,
        limit: input.limit
      });

      let templates = Array.isArray(result) ? result.map(mapTemplate) : [];

      return {
        output: { templates },
        message: `Found **${templates.length}** WhatsApp template(s).`
      };
    }

    if (input.action === 'get') {
      if (!input.templateId) throw new Error('templateId is required for "get" action');

      let result = await client.getTemplate(input.templateId);
      let template = mapTemplate(result);

      return {
        output: { template },
        message: `Retrieved template **${template.name}** (${template.status}).`
      };
    }

    if (input.action === 'create') {
      if (!input.name) throw new Error('name is required for "create" action');
      if (!input.language) throw new Error('language is required for "create" action');
      if (!input.category) throw new Error('category is required for "create" action');
      if (!input.components) throw new Error('components is required for "create" action');

      let result = await client.createTemplate({
        name: input.name,
        language: input.language,
        category: input.category,
        components: input.components
      });

      return {
        output: { template: mapTemplate(result), rawResponse: result },
        message: `Template **${input.name}** created successfully and submitted for approval.`
      };
    }

    if (input.action === 'edit') {
      if (!input.name) throw new Error('name is required for "edit" action');
      if (!input.templateId) throw new Error('templateId is required for "edit" action');

      let result = await client.editTemplate({
        name: input.name,
        templateId: input.templateId,
        components: input.components,
        category: input.category
      });

      return {
        output: { rawResponse: result },
        message: `Template **${input.name}** updated successfully.`
      };
    }

    if (input.action === 'delete') {
      if (!input.name) throw new Error('name is required for "delete" action');
      if (!input.templateId) throw new Error('templateId is required for "delete" action');

      await client.deleteTemplate({
        name: input.name,
        templateId: input.templateId
      });

      return {
        output: { deleted: true },
        message: `Template **${input.name}** (${input.templateId}) deleted.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
