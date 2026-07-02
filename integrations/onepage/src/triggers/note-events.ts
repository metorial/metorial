import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { noteSchema } from '../lib/schemas';
import { spec } from '../spec';

export let noteEvents = SlateTrigger.create(spec, {
  name: 'Note Events',
  key: 'note_events',
  description:
    'Triggered when a note is created, updated, or deleted in OnePageCRM. Configure the webhook URL in OnePageCRM Apps settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of note event'),
      noteId: z.string().describe('ID of the affected note'),
      timestamp: z.string().describe('Timestamp of the event'),
      rawData: z.any().describe('Raw note data from the webhook payload')
    })
  )
  .output(noteSchema)
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.type !== 'note') {
        return { inputs: [] };
      }

      let noteData = body.data ?? {};

      return {
        inputs: [
          {
            eventType: body.reason ?? 'unknown',
            noteId: noteData.id ?? '',
            timestamp: body.timestamp ?? new Date().toISOString(),
            rawData: noteData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let n = ctx.input.rawData;

      let output = {
        noteId: n.id ?? ctx.input.noteId,
        contactId: n.contact_id ?? '',
        authorId: n.author_id ?? n.author,
        text: n.text ?? '',
        linkedDealId: n.linked_deal_id,
        date: n.date,
        createdAt: n.created_at,
        modifiedAt: n.modified_at
      };

      return {
        type: `note.${ctx.input.eventType}`,
        id: `note-${ctx.input.noteId}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output
      };
    }
  })
  .build();
