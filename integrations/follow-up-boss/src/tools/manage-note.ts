import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageNote = SlateTool.create(spec, {
  name: 'Manage Note',
  key: 'manage_note',
  description: `Create, update, retrieve, or delete a note on a contact in Follow Up Boss. Notes are used for recording information and team collaboration.`,
  instructions: [
    'To create a note, provide personId and body.',
    'To update, provide the noteId and updated body.',
    'To retrieve, provide only the noteId.',
    'To delete, set "delete" to true with a noteId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      noteId: z
        .number()
        .optional()
        .describe('ID of an existing note to update, retrieve, or delete'),
      personId: z.number().optional().describe('Contact ID to create the note on'),
      subject: z.string().optional().describe('Note subject'),
      body: z.string().optional().describe('Note body content'),
      isHtml: z.boolean().optional().describe('Whether the body is HTML formatted'),
      delete: z.boolean().optional().describe('Set to true to delete the note')
    })
  )
  .output(
    z.object({
      noteId: z.number().optional(),
      personId: z.number().optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      created: z.string().optional(),
      updated: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.delete && ctx.input.noteId) {
      await client.deleteNote(ctx.input.noteId);
      return {
        output: { noteId: ctx.input.noteId, deleted: true },
        message: `Deleted note **${ctx.input.noteId}**.`
      };
    }

    if (ctx.input.noteId && !ctx.input.body && !ctx.input.subject && !ctx.input.personId) {
      let note = await client.getNote(ctx.input.noteId);
      return {
        output: {
          noteId: note.id,
          personId: note.personId,
          subject: note.subject,
          body: note.body,
          created: note.created,
          updated: note.updated
        },
        message: `Retrieved note **${ctx.input.noteId}**.`
      };
    }

    let note: any;
    let action: string;

    if (ctx.input.noteId) {
      let data: Record<string, any> = {};
      if (ctx.input.body !== undefined) data.body = ctx.input.body;
      if (ctx.input.subject !== undefined) data.subject = ctx.input.subject;
      if (ctx.input.isHtml !== undefined) data.isHtml = ctx.input.isHtml;
      note = await client.updateNote(ctx.input.noteId, data);
      action = 'Updated';
    } else {
      note = await client.createNote({
        personId: ctx.input.personId!,
        body: ctx.input.body!,
        subject: ctx.input.subject,
        isHtml: ctx.input.isHtml
      });
      action = 'Created';
    }

    return {
      output: {
        noteId: note.id,
        personId: note.personId,
        subject: note.subject,
        body: note.body,
        created: note.created,
        updated: note.updated
      },
      message: `${action} note **${note.id}** on contact **${note.personId}**.`
    };
  })
  .build();
