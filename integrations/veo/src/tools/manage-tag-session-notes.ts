import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTagSessionNotes = SlateTool.create(spec, {
  name: 'Manage Tag Session Notes',
  key: 'manage_tag_session_notes',
  description: `List, create, or delete notes on tag sessions in VEO. Notes are attached to specific tags within a tagging session and support threaded replies (max 2 levels deep).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tagSessionId: z.string().describe('ID of the tag session (tagged video)'),
      action: z
        .enum(['list', 'create', 'delete'])
        .describe(
          'Action: "list" to get notes, "create" to add a note, "delete" to remove one'
        ),
      tagId: z
        .string()
        .optional()
        .describe(
          'ID of the specific tag within the session (required for "create" and "delete")'
        ),
      message: z.string().optional().describe('Note text (required for "create")'),
      parentCommentId: z
        .number()
        .optional()
        .describe('ID of the parent note for threaded replies (optional for "create")'),
      noteId: z
        .string()
        .optional()
        .describe('ID of the note to delete (required for "delete")')
    })
  )
  .output(
    z.object({
      notes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of notes with nested replies (when action is "list")'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    if (ctx.input.action === 'list') {
      let notes = await client.getTagSessionNotes(ctx.input.tagSessionId);
      let noteList = Array.isArray(notes) ? notes : [];

      return {
        output: { notes: noteList, success: true },
        message: `Retrieved **${noteList.length}** notes for tag session \`${ctx.input.tagSessionId}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.tagId) {
        throw new Error('tagId is required when creating a note');
      }
      if (!ctx.input.message) {
        throw new Error('message is required when creating a note');
      }
      await client.createTagSessionNote(
        ctx.input.tagSessionId,
        ctx.input.tagId,
        ctx.input.message,
        ctx.input.parentCommentId
      );

      return {
        output: { success: true },
        message: `Added note to tag \`${ctx.input.tagId}\` in session \`${ctx.input.tagSessionId}\`.`
      };
    }

    if (!ctx.input.tagId) {
      throw new Error('tagId is required when deleting a note');
    }
    if (!ctx.input.noteId) {
      throw new Error('noteId is required when deleting a note');
    }
    await client.deleteTagSessionNote(
      ctx.input.tagSessionId,
      ctx.input.tagId,
      ctx.input.noteId
    );

    return {
      output: { success: true },
      message: `Deleted note \`${ctx.input.noteId}\` from tag session \`${ctx.input.tagSessionId}\`.`
    };
  })
  .build();
