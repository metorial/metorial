import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fontSchema = z.object({
  fontId: z.string().describe('Unique ID of the handwriting style'),
  label: z.string().describe('Display label/name of the handwriting style'),
  previewImageUrl: z
    .string()
    .optional()
    .describe('URL to a preview image of the handwriting style')
});

export let listHandwritingStyles = SlateTool.create(spec, {
  name: 'List Handwriting Styles',
  key: 'list_handwriting_styles',
  description: `Retrieve all available handwriting styles (fonts). Each style uses a different handwriting appearance written by robotic pens. Use the returned font label when sending cards.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      fonts: z.array(fontSchema).describe('Available handwriting styles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listFonts();
    let rawFonts = result.fonts ?? [];

    let fonts = rawFonts.map((f: any) => ({
      fontId: String(f.id),
      label: f.label ?? f.name ?? '',
      previewImageUrl: f.image ?? f.preview_url ?? undefined
    }));

    return {
      output: { fonts },
      message: `Found **${fonts.length}** handwriting styles.`
    };
  })
  .build();
