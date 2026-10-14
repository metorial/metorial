import { SlateTool } from 'slates';
import { z } from 'zod';
import { callNoteSchema, mapCallNote } from '../lib/call-note';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCallNote = SlateTool.create(spec, {
  name: 'Update Call Note',
  key: 'update_call_note',
  description:
    'Update the translated text of an existing call note for a specific locale. Returns the note with its current translations.',
  instructions: [
    'Call list_call_notes or get_call_note to find the note UUID and an existing translation locale.',
    'Requires write_calls permission and access to the associated call.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      noteUuid: z
        .string()
        .describe('Call note UUID. Call list_call_notes to discover note UUIDs.'),
      locale: z.string().describe('Locale of the translation to update, such as en-US'),
      text: z.string().describe('New translated note text')
    })
  )
  .output(callNoteSchema)
  .handleInvocation(async ctx => {
    let response = await new Client(ctx.auth.token).updateCallNote(
      ctx.input.noteUuid,
      ctx.input.locale,
      ctx.input.text
    );
    return {
      output: mapCallNote(response.data),
      message: `Updated **${ctx.input.locale}** translation of call note **${response.data.uuid}**.`
    };
  })
  .build();
