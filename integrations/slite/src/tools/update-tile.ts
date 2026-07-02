import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTile = SlateTool.create(spec, {
  name: 'Update Tile',
  key: 'update_tile',
  description: `Update a specific tile (content block) within a note. Tiles can have a title, icon, status badge, external link, and markdown content. Use this to push dynamic or external data into specific sections of a document.`,
  instructions: [
    'The tileId can be obtained by copying the block ID from the Slite editor.',
    'Set any field to null to clear it.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      noteId: z.string().describe('ID of the note containing the tile'),
      tileId: z.string().describe('ID of the tile to update'),
      title: z.string().nullable().optional().describe('Header text for the tile'),
      iconURL: z.string().nullable().optional().describe('URL to an icon image for the tile'),
      status: z
        .object({
          label: z.string().describe('Status text'),
          colorHex: z.string().describe('Hex color code (e.g. #FF0000)')
        })
        .nullable()
        .optional()
        .describe('Status badge for the tile'),
      url: z.string().nullable().optional().describe('External link URL'),
      content: z.string().nullable().optional().describe('Markdown content for the tile')
    })
  )
  .output(
    z.object({
      tileUrl: z.string().describe('Direct URL to the tile within the note')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.updateTile(ctx.input.noteId, ctx.input.tileId, {
      title: ctx.input.title,
      iconURL: ctx.input.iconURL,
      status: ctx.input.status,
      url: ctx.input.url,
      content: ctx.input.content
    });

    return {
      output: {
        tileUrl: result.url
      },
      message: `Updated tile — [View tile](${result.url})`
    };
  })
  .build();
