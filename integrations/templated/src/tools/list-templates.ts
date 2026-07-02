import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateSchema = z.object({
  templateId: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  thumbnail: z.string().optional(),
  layersCount: z.number().optional(),
  folderId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  layers: z.any().optional(),
  pages: z.any().optional()
});

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Search and list templates in your account. Supports filtering by name, dimensions, tags, and external ID. Optionally include layer and page data in the response.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search templates by name'),
      page: z.number().optional().describe('Page number for pagination (starts at 0)'),
      limit: z.number().optional().describe('Results per page. Default: 25'),
      width: z.number().optional().describe('Filter by template width'),
      height: z.number().optional().describe('Filter by template height'),
      tags: z.string().optional().describe('Comma-separated tags to filter by'),
      externalId: z.string().optional().describe('Filter by external ID'),
      includeLayers: z.boolean().optional().describe('Include layer data in response'),
      includePages: z
        .boolean()
        .optional()
        .describe('Include page and layer information in response')
    })
  )
  .output(
    z.object({
      templates: z.array(templateSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let templates = await client.listTemplates({
      query: ctx.input.query,
      page: ctx.input.page,
      limit: ctx.input.limit,
      width: ctx.input.width,
      height: ctx.input.height,
      tags: ctx.input.tags,
      externalId: ctx.input.externalId,
      includeLayers: ctx.input.includeLayers,
      includePages: ctx.input.includePages
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
          layersCount: t.layersCount,
          folderId: t.folderId,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          layers: t.layers,
          pages: t.pages
        }))
      },
      message: `Found **${items.length}** template(s).`
    };
  })
  .build();
