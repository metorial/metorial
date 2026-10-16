import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

export let listDesigns = SlateTool.create(spec, {
  name: 'List Designs',
  key: 'list_designs',
  description: `List all designs (templates) in your Abyssale workspace. Optionally filter by design type or project, search, sort, or page the results. Returns design metadata including name, type, timestamps, and preview URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      designType: z
        .enum(['static', 'animated', 'printer', 'printer_multipage'])
        .optional()
        .describe(
          'Filter designs by type. Static for images, animated for videos/GIFs/HTML5, printer for PDFs, printer_multipage for multi-page PDFs.'
        ),
      categoryId: z
        .string()
        .optional()
        .describe(
          'Legacy project filter. Prefer projectId; this is the deprecated category_id alias.'
        ),
      projectId: z
        .string()
        .optional()
        .describe('Project ID. Call list_projects to discover projects.'),
      query: z
        .string()
        .optional()
        .describe('Search words in design and project names, up to eight words.'),
      name: z.string().optional().describe('Phrase to match in design names.'),
      project: z.string().optional().describe('Phrase to match in project names.'),
      orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
      sizes: z
        .array(z.string())
        .max(10)
        .optional()
        .describe('Format sizes such as 1080x1920, in the design unit.'),
      formatNames: z.array(z.string()).max(10).optional(),
      updatedSince: z.string().optional().describe('ISO 8601 date or date-time.'),
      createdSince: z.string().optional().describe('ISO 8601 date or date-time.'),
      sort: z.enum(['name', 'updated', 'created']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
      page: z
        .number()
        .optional()
        .describe('1-based page. Omit page and perPage to return every match.'),
      perPage: z
        .number()
        .optional()
        .describe('Items per page; values over 100 are capped by the provider.')
    })
  )
  .output(
    z.object({
      designs: z.array(
        z.object({
          designId: z.string().describe('Unique identifier of the design'),
          name: z.string().describe('Display name of the design'),
          type: z
            .string()
            .describe('Design type: static, animated, printer, or printer_multipage'),
          createdAt: z.string().describe('Unix timestamp of creation'),
          updatedAt: z.string().describe('Unix timestamp of last modification'),
          previewUrl: z.string().describe('Preview image URL for the first format'),
          categoryName: z.string().nullable().describe('Legacy alias of projectName'),
          projectId: z.string().nullable().optional(),
          projectName: z.string().nullable().optional(),
          raw: z.record(z.string(), z.any()).optional()
        })
      ),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let result = await client.listDesigns({ ...ctx.input, type: ctx.input.designType });
    let designs = result.items;

    let mapped = designs.map(d => ({
      designId: d.id,
      name: d.name,
      type: d.type,
      createdAt: String(d.created_at),
      updatedAt: String(d.updated_at),
      previewUrl: d.preview_url,
      categoryName: d.category_name,
      projectId: d.project_id,
      projectName: d.project_name,
      raw: d
    }));

    return {
      output: { designs: mapped, totalCount: result.totalCount },
      message: `Found **${mapped.length}** design(s)${ctx.input.designType ? ` of type \`${ctx.input.designType}\`` : ''}.`
    };
  })
  .build();
