import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFonts = SlateTool.create(spec, {
  name: 'List Fonts',
  key: 'list_fonts',
  description: `List all available fonts, including both Google Fonts and custom uploaded fonts.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      fonts: z.array(
        z.object({
          fontName: z.string().optional(),
          isGoogleFont: z.boolean().optional(),
          isUploadedFont: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let fonts = await client.listFonts();

    let items = Array.isArray(fonts) ? fonts : [];

    return {
      output: {
        fonts: items.map((f: any) => ({
          fontName: f.name,
          isGoogleFont: f.isGoogleFont,
          isUploadedFont: f.isUploadedFont
        }))
      },
      message: `Found **${items.length}** font(s).`
    };
  })
  .build();
