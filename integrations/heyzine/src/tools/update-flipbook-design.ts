import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyzineClient } from '../lib/client';
import { spec } from '../spec';

export let updateFlipbookDesign = SlateTool.create(spec, {
  name: 'Update Flipbook Design',
  key: 'update_flipbook_design',
  description:
    'Updates an existing flipbook’s reader appearance, controls, metadata, and tags. A template copies styles first; explicitly provided settings override the template.',
  instructions: ['Provide at least one setting. Unspecified settings remain unchanged.']
})
  .input(
    z.object({
      flipbookId: z
        .string()
        .describe('Flipbook identifier returned by list_flipbooks or create_flipbook.'),
      templateFlipbookId: z
        .string()
        .optional()
        .describe('Copy styles from this existing flipbook.'),
      title: z.string().optional().describe('Reader title and social-sharing title.'),
      subtitle: z.string().optional().describe('Reader subtitle.'),
      description: z.string().optional().describe('Reader description.'),
      privateNote: z
        .string()
        .optional()
        .describe('Private management note, hidden from readers.'),
      tags: z.string().optional().describe('Comma-separated organizational tags.'),
      logoUrl: z
        .string()
        .optional()
        .describe('Logo image URL; requires Standard plan or above.'),
      backgroundColor: z
        .string()
        .optional()
        .describe('Solid hexadecimal background color, without #.'),
      downloadButton: z.boolean().optional().describe('Allow downloading the original PDF.'),
      fullscreen: z.boolean().optional().describe('Show the fullscreen button.'),
      share: z.boolean().optional().describe('Show the share button.'),
      navigationButtons: z.boolean().optional().describe('Show previous and next buttons.'),
      showInfo: z
        .boolean()
        .optional()
        .describe('Show title, subtitle, and description on the background.'),
      pageEffect: z
        .enum([
          'magazine',
          'book',
          'album',
          'notebook',
          'slideshow',
          'cards',
          'coverflow',
          'onepage'
        ])
        .optional()
        .describe('Reader page effect.'),
      rightToLeft: z.boolean().optional().describe('Use right-to-left reading direction.')
    })
  )
  .output(z.object({ success: z.boolean().describe('Whether Heyzine confirmed the update.') }))
  .handleInvocation(async ctx => {
    let client = new HeyzineClient(ctx.auth);
    let result = await client.updateFlipbookDesign(ctx.input.flipbookId, ctx.input);
    return {
      output: { success: result.success },
      message: `Updated flipbook **${ctx.input.flipbookId}**.`
    };
  })
  .build();
