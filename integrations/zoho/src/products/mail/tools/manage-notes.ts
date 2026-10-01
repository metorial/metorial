import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { Client } from '../lib/client';

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
  name: 'Mail Manage Notes',
  key: 'mail_manage_notes',
  description: `Create, list, update, or delete notes in Zoho Mail. Supports both personal and group notes. Notes can be organized into books/notebooks.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['listGroups', 'list', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      scope: z
        .enum(['personal', 'group'])
        .default('personal')
        .describe('Whether this is a personal or group note'),
      groupId: z
        .string()
        .optional()
        .describe(
          'Group ID. Call mail_manage_notes with listGroups to discover groups. Required when scope is "group")'
        ),
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
      groups: z.array(z.object({ id: z.string(), name: z.string().optional() })).optional(),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.auth.region
    });

    let { action, scope, groupId } = ctx.input;
    if (action === 'listGroups') {
      let groups = await client.listNoteGroups();
      return {
        output: {
          success: true,
          groups: groups.map((group: any) => ({
            id: String(group.groupId || group.id || group.zgid),
            name: group.groupName || group.name
          }))
        },
        message: `Retrieved ${groups.length} groups.`
      };
    }

    if (scope === 'group' && !groupId) {
      throw createApiServiceError('groupId is required for group note operations');
    }

    let mapNote = (n: any) => ({
      noteId: String(n.noteId || n.entityId || n.id),
      noteName: n.title || n.noteName,
      noteContent: n.content || n.noteContent,
      bookId: n.bookId ? String(n.bookId) : undefined,
      createdTime: n.createdTime ? String(n.createdTime) : undefined,
      modifiedTime: n.modifiedTime ? String(n.modifiedTime) : undefined,
      isFavorite: n.isFavorite === true || n.isFavorite === 'true',
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
      if (!ctx.input.noteContent) {
        throw createApiServiceError('noteContent is required for create action');
      }
      let noteData: any = {
        content: ctx.input.noteContent,
        title: ctx.input.noteName,
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
      if (!ctx.input.noteId) {
        throw createApiServiceError('noteId is required for update action');
      }
      let noteData: any = {};
      if (ctx.input.noteName) noteData.title = ctx.input.noteName;
      if (ctx.input.noteContent) noteData.content = ctx.input.noteContent;
      let result =
        scope === 'group' && groupId
          ? await client.updateGroupNote(groupId, ctx.input.noteId, noteData)
          : await client.updatePersonalNote(ctx.input.noteId, noteData);
      return {
        output: {
          note: mapNote(result || { noteId: ctx.input.noteId, ...noteData }),
          success: true
        },
        message: `Updated note ${ctx.input.noteId}.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.noteId) {
        throw createApiServiceError('noteId is required for delete action');
      }
      if (scope === 'group' && groupId)
        await client.deleteGroupNote(groupId, ctx.input.noteId);
      else await client.deletePersonalNote(ctx.input.noteId);
      return {
        output: { success: true },
        message: `Deleted note ${ctx.input.noteId}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
