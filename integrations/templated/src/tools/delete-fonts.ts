import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteFonts = SlateTool.create(spec, {
  name: 'Delete Fonts',
  key: 'delete_fonts',
  description: `Delete custom uploaded fonts by name. Supports bulk deletion. All fonts matching the specified names will be removed.`,
  tags: {
    destructive: true
  },
  constraints: [
    'Font names are case-sensitive.',
    'Only custom uploaded fonts can be deleted, not Google Fonts.'
  ]
})
  .input(
    z.object({
      fontNames: z.array(z.string()).describe('Names of the fonts to delete')
    })
  )
  .output(
    z.object({
      deletedIds: z.array(z.string()).optional(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.deleteFonts(ctx.input.fontNames);

    return {
      output: {
        deletedIds: result.deleted,
        message: result.message
      },
      message: `Deleted font(s): **${ctx.input.fontNames.join(', ')}**.`
    };
  })
  .build();
