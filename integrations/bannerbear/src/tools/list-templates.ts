import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List available Bannerbear design templates in the current project. Supports filtering by tag or name, and pagination. Use this to discover template UIDs needed for image, video, or GIF generation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default 1)'),
      limit: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 25)'),
      tag: z.string().optional().describe('Filter templates by tag'),
      name: z.string().optional().describe('Filter templates by name')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateUid: z.string().describe('UID of the template'),
            name: z.string().describe('Template name'),
            width: z.number().describe('Template width in pixels'),
            height: z.number().describe('Template height in pixels'),
            previewUrl: z.string().nullable().describe('Preview image URL'),
            tags: z.array(z.string()).describe('Template tags'),
            createdAt: z.string().describe('Timestamp when the template was created')
          })
        )
        .describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BannerbearClient({ token: ctx.auth.token });

    let results = await client.listTemplates({
      page: ctx.input.page,
      limit: ctx.input.limit,
      tag: ctx.input.tag,
      name: ctx.input.name
    });

    let templates = (Array.isArray(results) ? results : []).map((t: any) => ({
      templateUid: t.uid,
      name: t.name,
      width: t.width,
      height: t.height,
      previewUrl: t.preview_url || null,
      tags: t.tags || [],
      createdAt: t.created_at
    }));

    return {
      output: { templates },
      message: `Found ${templates.length} template(s).${ctx.input.tag ? ` Filtered by tag: "${ctx.input.tag}".` : ''}${ctx.input.name ? ` Filtered by name: "${ctx.input.name}".` : ''}`
    };
  })
  .build();
