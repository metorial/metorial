import { SlateTool } from 'slates';
import { z } from 'zod';
import { VbmlClient } from '../lib/vbml';
import { spec } from '../spec';

export let formatText = SlateTool.create(spec, {
  name: 'Format Text',
  key: 'format_text',
  description: `Convert a plain text string into a Vestaboard character code array. Useful for previewing how text will appear on the board or for preparing character arrays for the Local API.

Does **not** require authentication — this is a public VBML formatting service.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The plain text message to convert into character codes.')
    })
  )
  .output(
    z.object({
      characters: z
        .array(z.array(z.number()))
        .describe('2D character code array representing the formatted text.')
    })
  )
  .handleInvocation(async ctx => {
    let vbml = new VbmlClient();
    let characters = await vbml.format(ctx.input.text);

    let rows = characters.length;
    let cols = characters[0]?.length ?? 0;

    return {
      output: { characters },
      message: `Formatted text into a ${rows}x${cols} character array.`
    };
  })
  .build();
