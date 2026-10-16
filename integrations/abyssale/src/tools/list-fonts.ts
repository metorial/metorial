import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

export let listFonts = SlateTool.create(spec, {
  name: 'List Fonts',
  key: 'list_fonts',
  description: `List all fonts available in your Abyssale workspace, including custom uploads and Google Fonts. Returns font IDs that can be used to override text element fonts during generation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z.enum(['google', 'custom']).optional(),
      name: z.string().optional().describe('Search for a font by name.'),
      category: z
        .enum(['serif', 'sans-serif', 'display', 'handwriting', 'monospace'])
        .optional(),
      weight: z.number().optional().describe('Weight from 100 to 900 in increments of 100.'),
      style: z.enum(['normal', 'italic']).optional(),
      page: z
        .number()
        .optional()
        .describe('1-based page. Omit page and perPage to return every match.'),
      perPage: z.number().optional().describe('Items per page; provider caps values over 100.')
    })
  )
  .output(
    z.object({
      fonts: z.array(
        z.object({
          fontId: z
            .string()
            .describe('Font UUID — use this to force a specific font on text elements'),
          name: z.string().describe('Font display name'),
          availableWeights: z
            .array(z.union([z.string(), z.number()]))
            .describe('Supported font weights (e.g., 400, 700, "italic")'),
          type: z.string().describe('Font source: "google" or "custom"'),
          category: z.string().optional(),
          raw: z.record(z.string(), z.any()).optional()
        })
      ),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let result = await client.listFonts(ctx.input);
    let fonts = result.items;

    let mapped = fonts.map(f => ({
      fontId: f.id,
      name: f.name,
      availableWeights: f.available_weights,
      type: f.type,
      category: f.category,
      raw: f
    }));

    return {
      output: { fonts: mapped, totalCount: result.totalCount },
      message: `Found **${mapped.length}** font(s) (${fonts.filter(f => f.type === 'custom').length} custom, ${fonts.filter(f => f.type === 'google').length} Google).`
    };
  })
  .build();
