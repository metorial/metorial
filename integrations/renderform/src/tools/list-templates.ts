import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all available templates in your RenderForm account. Returns template names, identifiers, preview URLs, dimensions, and tags. Supports filtering by name and tags with pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter templates by name'),
      tags: z.array(z.string()).optional().describe('Filter templates by tags'),
      page: z.number().optional().describe('Page number for pagination (0-indexed)'),
      size: z.number().optional().describe('Number of templates per page (max 50)')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique template identifier'),
            name: z.string().describe('Template display name'),
            previewUrl: z.string().optional().describe('URL to template preview image'),
            scaleFactor: z.number().optional().describe('Scale factor for rendering'),
            outputFormat: z
              .string()
              .optional()
              .describe('Default output format (e.g. jpeg, png, pdf)'),
            width: z.number().optional().describe('Template width in pixels'),
            height: z.number().optional().describe('Template height in pixels'),
            createdBy: z.string().optional().describe('Name of the template creator'),
            editor: z
              .string()
              .optional()
              .describe('Editor type (e.g. canvas-html, canvas-editor)'),
            tags: z.array(z.string()).optional().describe('Tags assigned to the template')
          })
        )
        .describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let templates = await client.listTemplates({
      name: ctx.input.name,
      tags: ctx.input.tags,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let mapped = templates.map(t => ({
      templateId: t.identifier,
      name: t.name,
      previewUrl: t.preview,
      scaleFactor: t.scaleFactor,
      outputFormat: t.outputFormat,
      width: t.width,
      height: t.height,
      createdBy: t.createdBy,
      editor: t.editor,
      tags: t.tags
    }));

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** template(s).`
    };
  })
  .build();
