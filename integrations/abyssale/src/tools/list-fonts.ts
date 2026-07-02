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
  .input(z.object({}))
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
          type: z.string().describe('Font source: "google" or "custom"')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let fonts = await client.listFonts();

    let mapped = fonts.map(f => ({
      fontId: f.id,
      name: f.name,
      availableWeights: f.available_weights,
      type: f.type
    }));

    return {
      output: { fonts: mapped },
      message: `Found **${mapped.length}** font(s) (${fonts.filter(f => f.type === 'custom').length} custom, ${fonts.filter(f => f.type === 'google').length} Google).`
    };
  })
  .build();
