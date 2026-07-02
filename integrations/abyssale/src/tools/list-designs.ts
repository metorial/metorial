import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

export let listDesigns = SlateTool.create(spec, {
  name: 'List Designs',
  key: 'list_designs',
  description: `List all designs (templates) in your Abyssale workspace. Optionally filter by design type or category. Returns design metadata including name, type, timestamps, and preview URLs.`,
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
      categoryId: z.string().optional().describe('Filter designs by category UUID.')
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
          categoryName: z.string().nullable().describe('Associated category label')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let designs = await client.listDesigns({
      type: ctx.input.designType,
      categoryId: ctx.input.categoryId
    });

    let mapped = designs.map(d => ({
      designId: d.id,
      name: d.name,
      type: d.type,
      createdAt: String(d.created_at),
      updatedAt: String(d.updated_at),
      previewUrl: d.preview_url,
      categoryName: d.category_name
    }));

    return {
      output: { designs: mapped },
      message: `Found **${mapped.length}** design(s)${ctx.input.designType ? ` of type \`${ctx.input.designType}\`` : ''}.`
    };
  })
  .build();
