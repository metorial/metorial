import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

let noteSchema = z.object({
  noteId: z.string().describe('Note identifier'),
  content: z.string().optional().describe('Note content/text'),
  position: z
    .object({
      x: z.number().describe('X position'),
      y: z.number().describe('Y position')
    })
    .optional()
    .describe('Position on the screen'),
  color: z.string().optional().describe('Note color'),
  status: z.string().optional().describe('Note status'),
  created: z.number().optional().describe('Creation timestamp'),
  updated: z.number().optional().describe('Last update timestamp'),
  creator: z
    .object({
      userId: z.string().optional().describe('Creator user ID'),
      username: z.string().optional().describe('Creator username')
    })
    .optional()
    .describe('User who created the note')
});

export let listScreenNotes = SlateTool.create(spec, {
  name: 'List Screen Notes',
  key: 'list_screen_notes',
  description: `List all notes (annotations and comments) on a specific screen in a Zeplin project. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      screenId: z.string().describe('ID of the screen'),
      limit: z.number().min(1).max(100).optional().describe('Number of results per page'),
      offset: z.number().min(0).optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      notes: z.array(noteSchema).describe('List of screen notes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let notes = (await client.listScreenNotes(ctx.input.projectId, ctx.input.screenId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    })) as any[];

    let mapped = notes.map((n: any) => ({
      noteId: n.id,
      content: n.content,
      position: n.position,
      color: n.color,
      status: n.status,
      created: n.created,
      updated: n.updated,
      creator: n.creator
        ? {
            userId: n.creator.id,
            username: n.creator.username
          }
        : undefined
    }));

    return {
      output: { notes: mapped },
      message: `Found **${mapped.length}** note(s) on the screen.`
    };
  })
  .build();

export let createScreenNote = SlateTool.create(spec, {
  name: 'Create Screen Note',
  key: 'create_screen_note',
  description: `Create a new note on a screen in a Zeplin project. Optionally specify position and color.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      screenId: z.string().describe('ID of the screen'),
      content: z.string().describe('Note content/text'),
      position: z
        .object({
          x: z.number().describe('X coordinate on the screen'),
          y: z.number().describe('Y coordinate on the screen')
        })
        .optional()
        .describe('Position on the screen'),
      color: z.string().optional().describe('Note color')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the created note'),
      content: z.string().optional().describe('Note content'),
      created: z.number().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let result = (await client.createScreenNote(ctx.input.projectId, ctx.input.screenId, {
      content: ctx.input.content,
      position: ctx.input.position,
      color: ctx.input.color
    })) as any;

    return {
      output: {
        noteId: result.id,
        content: result.content,
        created: result.created
      },
      message: `Created a new note on the screen.`
    };
  })
  .build();

export let deleteScreenNote = SlateTool.create(spec, {
  name: 'Delete Screen Note',
  key: 'delete_screen_note',
  description: `Delete a note from a screen in a Zeplin project.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      screenId: z.string().describe('ID of the screen'),
      noteId: z.string().describe('ID of the note to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    await client.deleteScreenNote(ctx.input.projectId, ctx.input.screenId, ctx.input.noteId);

    return {
      output: { success: true },
      message: `Deleted note **${ctx.input.noteId}** from the screen.`
    };
  })
  .build();

export let addNoteComment = SlateTool.create(spec, {
  name: 'Add Note Comment',
  key: 'add_note_comment',
  description: `Add a comment (reply) to an existing note on a screen. Use this to participate in design discussions.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      screenId: z.string().describe('ID of the screen'),
      noteId: z.string().describe('ID of the note to comment on'),
      content: z.string().describe('Comment content/text')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the created comment'),
      content: z.string().optional().describe('Comment content'),
      created: z.number().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let result = (await client.createNoteComment(
      ctx.input.projectId,
      ctx.input.screenId,
      ctx.input.noteId,
      { content: ctx.input.content }
    )) as any;

    return {
      output: {
        commentId: result.id,
        content: result.content,
        created: result.created
      },
      message: `Added a comment to note **${ctx.input.noteId}**.`
    };
  })
  .build();
