import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let noteSchema = z.object({
  noteId: z.string().describe('Note ID'),
  noteName: z.string().optional().describe('Note title'),
  noteContent: z.string().optional().describe('Note body content'),
  bookId: z.string().optional().describe('Book/notebook ID'),
  createdTime: z.string().optional().describe('Creation timestamp'),
  modifiedTime: z.string().optional().describe('Last modified timestamp'),
  isFavorite: z.boolean().optional().describe('Whether the note is favorited'),
  groupId: z.string().optional().describe('Group ID if group note')
});

export let manageNotes = SlateTool.create(spec, {
  name: 'Manage Notes',
  key: 'manage_notes',
  description: `Create, list, update, or delete notes in Zoho Mail. Supports both personal and group notes. Notes can be organized into books/notebooks.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      scope: z
        .enum(['personal', 'group'])
        .default('personal')
        .describe('Whether this is a personal or group note'),
      groupId: z.string().optional().describe('Group ID (required when scope is "group")'),
      noteId: z.string().optional().describe('Note ID (required for update, delete)'),
      noteName: z.string().optional().describe('Note title'),
      noteContent: z.string().optional().describe('Note body content (required for create)'),
      bookId: z.string().optional().describe('Book/notebook ID to organize the note into'),
      start: z.number().optional().describe('Starting position for list pagination'),
      limit: z.number().optional().describe('Number of notes to return')
    })
  )
  .output(
    z.object({
      notes: z.array(noteSchema).optional().describe('List of notes (for list action)'),
      note: noteSchema.optional().describe('Created or updated note'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.dataCenterDomain
    });

    let { action, scope, groupId } = ctx.input;

    if (scope === 'group' && !groupId) {
      throw new Error('groupId is required for group note operations');
    }

    let mapNote = (n: any) => ({
      noteId: String(n.noteId || n.id),
      noteName: n.noteName,
      noteContent: n.noteContent,
      bookId: n.bookId ? String(n.bookId) : undefined,
      createdTime: n.createdTime ? String(n.createdTime) : undefined,
      modifiedTime: n.modifiedTime ? String(n.modifiedTime) : undefined,
      isFavorite: n.isFavorite,
      groupId: n.groupId ? String(n.groupId) : groupId || undefined
    });

    if (action === 'list') {
      let params = { start: ctx.input.start, limit: ctx.input.limit };
      let notes =
        scope === 'group' && groupId
          ? await client.listGroupNotes(groupId, params)
          : await client.listPersonalNotes(params);
      let mapped = notes.map(mapNote);
      return {
        output: { notes: mapped, success: true },
        message: `Retrieved **${mapped.length}** ${scope} note(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.noteContent) throw new Error('noteContent is required for create action');
      let noteData: any = {
        noteContent: ctx.input.noteContent,
        noteName: ctx.input.noteName,
        bookId: ctx.input.bookId
      };
      let result =
        scope === 'group' && groupId
          ? await client.createGroupNote(groupId, noteData)
          : await client.createPersonalNote(noteData);
      return {
        output: { note: mapNote(result || {}), success: true },
        message: `Created ${scope} note${ctx.input.noteName ? ` "**${ctx.input.noteName}**"` : ''}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.noteId) throw new Error('noteId is required for update action');
      let noteData: any = {};
      if (ctx.input.noteName) noteData.noteName = ctx.input.noteName;
      if (ctx.input.noteContent) noteData.noteContent = ctx.input.noteContent;
      let result = await client.updatePersonalNote(ctx.input.noteId, noteData);
      return {
        output: {
          note: mapNote(result || { noteId: ctx.input.noteId, ...noteData }),
          success: true
        },
        message: `Updated note ${ctx.input.noteId}.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.noteId) throw new Error('noteId is required for delete action');
      await client.deletePersonalNote(ctx.input.noteId);
      return {
        output: { success: true },
        message: `Deleted note ${ctx.input.noteId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
