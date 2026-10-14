import { SlateTool } from 'slates';
import { z } from 'zod';
import { callNoteSchema, mapCallNote } from '../lib/call-note';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCallNote = SlateTool.create(spec, {
  name: 'Get Call Note',
  key: 'get_call_note',
  description:
    'Retrieve a call note, its associated prompt, and all current translations by note UUID.',
  instructions: [
    'Call list_call_notes to find note UUIDs.',
    'Requires read_calls permission and access to the associated call.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      noteUuid: z
        .string()
        .describe('Call note UUID. Call list_call_notes to discover note UUIDs.')
    })
  )
  .output(callNoteSchema)
  .handleInvocation(async ctx => {
    let response = await new Client(ctx.auth.token).getCallNote(ctx.input.noteUuid);
    return {
      output: mapCallNote(response.data),
      message: `Retrieved call note **${response.data.uuid}**.`
    };
  })
  .build();
