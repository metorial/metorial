import { SlateTool } from 'slates';
import { z } from 'zod';
import { PostalyticsClient } from '../lib/client';
import { spec } from '../spec';

export let manageTemplates = SlateTool.create(spec, {
  name: 'Manage Templates',
  key: 'manage_templates',
  description: `List, retrieve, create, or delete mail piece templates. Templates define the design and layout for postcards, letters, and self-mailers, and support merge fields for personalization.`,
  instructions: [
    'Use action "list" to see all available templates.',
    'Use action "get" to retrieve a specific template by ID.',
    'Use action "create" to create a new HTML template. Size values: 1 = 4x6 postcard, 2 = 6x9 postcard, 3 = 6x11 postcard, 4 = letter.',
    'Use action "delete" to remove a template.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'delete']).describe('The action to perform'),
      templateId: z
        .string()
        .optional()
        .describe('Template ID (required for get, delete actions)'),
      name: z.string().optional().describe('Template name (required for create action)'),
      html: z
        .string()
        .optional()
        .describe('Template HTML content (required for create action)'),
      size: z
        .number()
        .optional()
        .describe(
          'Template size: 1 = 4x6 postcard, 2 = 6x9 postcard, 3 = 6x11 postcard, 4 = letter (required for create)'
        )
    })
  )
  .output(
    z.object({
      templates: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of templates'),
      template: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Single template record'),
      result: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Operation result for create/delete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PostalyticsClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let templates = await client.getTemplates();
      return {
        output: { templates },
        message: `Found **${templates.length}** template(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.templateId) throw new Error('templateId is required for get action');
      let template = await client.getTemplate(ctx.input.templateId);
      return {
        output: { template },
        message: `Retrieved template **${template.name || ctx.input.templateId}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      if (!ctx.input.html) throw new Error('html is required for create action');
      if (ctx.input.size === undefined) throw new Error('size is required for create action');
      let result = await client.createTemplate({
        name: ctx.input.name,
        html: ctx.input.html,
        size: ctx.input.size
      });
      return {
        output: { result },
        message: `Template **${ctx.input.name}** created successfully.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.templateId) throw new Error('templateId is required for delete action');
      let result = await client.deleteTemplate(ctx.input.templateId);
      return {
        output: { result },
        message: `Template **${ctx.input.templateId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
