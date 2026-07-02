import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let browseGallery = SlateTool.create(spec, {
  name: 'Browse Gallery',
  key: 'browse_gallery',
  description: `Browse pre-made templates from the Templated gallery. Gallery templates are read-only but can be cloned into your account for editing using the Duplicate Template tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search by name or description'),
      category: z.string().optional().describe('Filter by category'),
      tags: z.string().optional().describe('Filter by comma-separated tags'),
      page: z.number().optional().describe('Page number (starts at 0)'),
      limit: z.number().optional().describe('Results per page. Default: 25'),
      width: z.number().optional().describe('Filter by width'),
      height: z.number().optional().describe('Filter by height'),
      includeLayers: z.boolean().optional().describe('Include layer data in response')
    })
  )
  .output(
    z.object({
      templates: z.array(
        z.object({
          templateId: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          thumbnail: z.string().optional(),
          category: z.any().optional(),
          tags: z.array(z.string()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let templates = await client.listGalleryTemplates({
      query: ctx.input.query,
      category: ctx.input.category,
      tags: ctx.input.tags,
      page: ctx.input.page,
      limit: ctx.input.limit,
      width: ctx.input.width,
      height: ctx.input.height,
      includeLayers: ctx.input.includeLayers
    });

    let items = Array.isArray(templates) ? templates : [];

    return {
      output: {
        templates: items.map((t: any) => ({
          templateId: t.id,
          name: t.name,
          description: t.description,
          width: t.width,
          height: t.height,
          thumbnail: t.thumbnail,
          category: t.category,
          tags: t.tags
        }))
      },
      message: `Found **${items.length}** gallery template(s).`
    };
  })
  .build();
