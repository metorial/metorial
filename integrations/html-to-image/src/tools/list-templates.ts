import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve all image templates on your account, or list all versions of a specific template. Returns template metadata including HTML, CSS, rendering configuration, and usage counts.`,
  instructions: [
    'Omit `templateId` to list all templates. Provide a `templateId` to list all versions of that template.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z
        .string()
        .optional()
        .describe(
          'If provided, lists all versions of this specific template. Otherwise lists all templates.'
        )
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique identifier for the template'),
            name: z.string().optional().describe('Name of the template'),
            description: z.string().optional().describe('Description of the template'),
            html: z.string().describe('HTML markup of the template'),
            css: z.string().optional().describe('CSS styling of the template'),
            googleFonts: z.string().optional().describe('Google Fonts configured'),
            msDelay: z.number().optional().describe('Render delay in milliseconds'),
            deviceScale: z.number().optional().describe('Device scale factor'),
            viewportWidth: z.number().optional().describe('Viewport width'),
            viewportHeight: z.number().optional().describe('Viewport height'),
            renderCount: z
              .number()
              .optional()
              .describe('Number of times this template has been used to render images'),
            createdAt: z
              .string()
              .optional()
              .describe('Timestamp when the template was created')
          })
        )
        .describe('List of templates or template versions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let templates = ctx.input.templateId
      ? await client.getTemplateVersions(ctx.input.templateId)
      : await client.listTemplates();

    let label = ctx.input.templateId
      ? `versions of template **${ctx.input.templateId}**`
      : 'template(s)';

    return {
      output: { templates },
      message: `Retrieved **${templates.length}** ${label}.`
    };
  })
  .build();
