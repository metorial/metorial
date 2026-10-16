import { createApiServiceError, SlateTool } from 'slates';
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
    'Use action "create" to create a new HTML template. Current size values: 0 = letter, 1 = 4x6 postcard, 2 = 6x9 postcard, 3 = 6x11 postcard, 6 = 12x9 bifold, 7 = 6x18 bifold. Legacy numeric values are forwarded unchanged.',
    'Use action "delete" to remove a template.'
  ],
  tags: {
    destructive: true,
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
        .describe('Template HTML content, required for create unless isFullHtml is false'),
      front: z
        .string()
        .optional()
        .describe(
          'Provider-accessible front image URL or letter front content when isFullHtml is false'
        ),
      back: z
        .string()
        .optional()
        .describe(
          'Provider-accessible back image URL or letter back content when isFullHtml is false'
        ),
      isFullHtml: z
        .boolean()
        .optional()
        .describe('Whether the HTML defines the full template; Postalytics defaults to true.'),
      isProofed: z
        .boolean()
        .optional()
        .describe(
          'Whether to bypass the provider proofing safeguards. Only set true after verifying the template design.'
        ),
      size: z
        .number()
        .optional()
        .describe(
          'Template size: 0 = letter, 1 = 4x6 postcard, 2 = 6x9 postcard, 3 = 6x11 postcard, 6 or 7 = bifold (required for create); numeric values are forwarded unchanged'
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
      if (!ctx.input.templateId)
        throw createApiServiceError('templateId is required for get action');
      let template = await client.getTemplate(ctx.input.templateId);
      return {
        output: { template },
        message: `Retrieved template **${template.name || ctx.input.templateId}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw createApiServiceError('name is required for create action');
      if (ctx.input.isFullHtml === false) {
        if (!ctx.input.front && !ctx.input.back) {
          throw createApiServiceError(
            'Provide front or back image content when isFullHtml is false.'
          );
        }
      } else if (!ctx.input.html) {
        throw createApiServiceError('html is required for create action');
      }
      if (ctx.input.size === undefined)
        throw createApiServiceError('size is required for create action');
      let result = await client.createTemplate({
        name: ctx.input.name,
        html: ctx.input.html,
        front: ctx.input.front,
        back: ctx.input.back,
        size: ctx.input.size,
        isFullHtml: ctx.input.isFullHtml,
        isProofed: ctx.input.isProofed
      });
      return {
        output: { result },
        message: `Template **${ctx.input.name}** created successfully.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.templateId)
        throw createApiServiceError('templateId is required for delete action');
      let result = await client.deleteTemplate(ctx.input.templateId);
      return {
        output: { result },
        message: `Template **${ctx.input.templateId}** deleted.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
