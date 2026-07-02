import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subtitleNotes = SlateTool.create(spec, {
  name: 'Subtitle Notes',
  key: 'subtitle_notes',
  description: `List or add notes on a subtitle set for communication between collaborators during the editing process. Omit "noteBody" to list existing notes, or provide it to add a new note.`
})
  .input(
    z.object({
      videoId: z.string().describe('The video identifier'),
      languageCode: z.string().describe('Language code (BCP-47)'),
      noteBody: z
        .string()
        .optional()
        .describe('Text of the note to add. Omit to list existing notes.')
    })
  )
  .output(
    z.object({
      added: z.boolean().describe('Whether a new note was added'),
      notes: z
        .array(
          z.object({
            username: z.string().describe('Username of the note author'),
            datetime: z.string().describe('When the note was created (ISO 8601)'),
            body: z.string().describe('Note content')
          })
        )
        .describe('List of notes (when listing) or the newly added note')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    if (ctx.input.noteBody) {
      let note = await client.addSubtitleNote(
        ctx.input.videoId,
        ctx.input.languageCode,
        ctx.input.noteBody
      );
      return {
        output: {
          added: true,
          notes: [
            {
              username: note.user?.username ?? '',
              datetime: note.datetime,
              body: note.body
            }
          ]
        },
        message: `Added note to \`${ctx.input.languageCode}\` subtitles on video \`${ctx.input.videoId}\`.`
      };
    }

    let result = await client.listSubtitleNotes(ctx.input.videoId, ctx.input.languageCode);
    let notes = result.objects.map(n => ({
      username: n.user?.username ?? '',
      datetime: n.datetime,
      body: n.body
    }));

    return {
      output: { added: false, notes },
      message: `Found **${notes.length}** note(s) on \`${ctx.input.languageCode}\` subtitles.`
    };
  })
  .build();
