import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

export let listFontsTool = SlateTool.create(spec, {
  name: 'List Fonts',
  key: 'list_fonts',
  description: `List all available fonts in your Mapbox account. Fonts are used in map styles for labels, text layers, and annotations. Returns the exact font names available for your map styles.`,
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
            fontFamily: z.string().describe('Exact font name returned by Mapbox'),
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

    if (!Array.isArray(result) || result.some(font => typeof font !== 'string')) {
      throw createApiServiceError(
        'Mapbox returned an invalid font list. Expected an array of font names.'
      );
    }
    let fonts = result.map(fontFamily => ({ fontFamily }));

    return {
      output: { fonts },
      message: `Found **${fonts.length}** font${fonts.length !== 1 ? 's' : ''}.`
    };
  });
