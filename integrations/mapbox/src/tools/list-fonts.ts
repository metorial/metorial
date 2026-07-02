import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

export let listFontsTool = SlateTool.create(spec, {
  name: 'List Fonts',
  key: 'list_fonts',
  description: `List all available fonts in your Mapbox account. Fonts are used in map styles for labels, text layers, and annotations. Returns the font stack names and their available font faces.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      fonts: z
        .array(
          z.object({
            fontFamily: z.string().describe('Font family name'),
            fontStyles: z
              .array(z.string())
              .optional()
              .describe('Available font style variants')
          })
        )
        .describe('Available fonts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let result = await client.listFonts();

    // The Fonts API returns an object with font family names as keys and arrays of font style names as values
    let fonts: Array<{ fontFamily: string; fontStyles?: string[] }> = [];
    if (result && typeof result === 'object') {
      for (let [family, styles] of Object.entries(result)) {
        fonts.push({
          fontFamily: family,
          fontStyles: Array.isArray(styles) ? (styles as string[]) : undefined
        });
      }
    }

    return {
      output: { fonts },
      message: `Found **${fonts.length}** font famil${fonts.length !== 1 ? 'ies' : 'y'}.`
    };
  });
