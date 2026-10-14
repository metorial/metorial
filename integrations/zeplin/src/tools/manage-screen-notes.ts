import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

let noteColors = [
  'yellow',
  'orange',
  'peach',
  'green',
  'turquoise',
  'cornflower_blue',
  'deep_purple'
] as const;

let positionSchema = z.object({
  x: z.number().min(0).max(1).describe('Normalized X coordinate from 0 to 1'),
  y: z.number().min(0).max(1).describe('Normalized Y coordinate from 0 to 1')
});

let noteSchema = z.object({
  noteId: z.string().describe('Note identifier'),
  content: z.string().optional().describe('Note content/text'),
  position: z
    .object({
      x: z.number().describe('X position'),
      y: z.number().describe('Y position'),
      xStart: z.number().optional().describe('Start X coordinate for an area note'),
      yStart: z.number().optional().describe('Start Y coordinate for an area note')
    })
    .optional()
    .describe('Position on the screen'),
  color: z.string().optional().describe('Note color'),
  status: z.string().optional().describe('Note status'),
  created: z.number().optional().describe('Creation timestamp'),
  updated: z.number().optional().describe('Last update timestamp'),
  comments: z
    .array(
      z.object({
        commentId: z.string().describe('Comment identifier'),
        content: z.string().describe('Comment text'),
        updated: z.number().optional().describe('Last update timestamp'),
        authorId: z.string().optional().describe('Author user identifier'),
        username: z.string().optional().describe('Author username')
      })
    )
    .optional()
    .describe('Comments in the discussion, including the initial note text'),
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
  description: `List a page of screen notes and their comments in a Zeplin project. Screen annotations are a separate resource.`,
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
      content: n.comments?.[0]?.content,
      position: n.position
        ? {
            x: n.position.x,
            y: n.position.y,
            xStart: n.position.x_start,
            yStart: n.position.y_start
          }
        : undefined,
      color: n.color?.name,
      status: n.status,
      created: n.created,
      updated: n.updated,
      comments: n.comments?.map((comment: any) => ({
        commentId: comment.id,
        content: comment.content,
        updated: comment.updated,
        authorId: comment.author?.id,
        username: comment.author?.username
      })),
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
  description: `Create a note on a screen in a Zeplin project. Defaults to a yellow note at the center of the screen when position or color is omitted.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      screenId: z.string().describe('ID of the screen'),
      content: z.string().describe('Note content/text'),
      position: positionSchema
        .optional()
        .describe('Normalized position on the screen; defaults to x=0.5, y=0.5'),
      color: z
        .string()
        .optional()
        .describe(
          'yellow, orange, peach, green, turquoise, cornflower_blue, or deep_purple; defaults to yellow'
        )
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
    if (
      ctx.input.color !== undefined &&
      !noteColors.some(color => color === ctx.input.color)
    ) {
      throw createApiServiceError(`Unsupported note color. Choose ${noteColors.join(', ')}.`);
    }
    let client = new ZeplinClient(ctx.auth.token);

    let result = (await client.createScreenNote(ctx.input.projectId, ctx.input.screenId, {
      content: ctx.input.content,
      position: ctx.input.position ?? { x: 0.5, y: 0.5 },
      color: ctx.input.color ?? 'yellow'
    })) as any;

    return {
      output: {
        noteId: result.id,
        content: ctx.input.content,
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
        content: ctx.input.content,
        created: result.created
      },
      message: `Added a comment to note **${ctx.input.noteId}**.`
    };
  })
  .build();

export let updateScreenNote = SlateTool.create(spec, {
  name: 'Update Screen Note',
  key: 'update_screen_note',
  description:
    'Resolve or reopen a screen note, or change its position or color. Comment text is separate from note properties.',
  tags: { destructive: false }
})
  .input(
    z.object({
      projectId: z.string().min(1).describe('Project ID from list_projects'),
      screenId: z.string().min(1).describe('Screen ID from list_screens'),
      noteId: z.string().min(1).describe('Note ID from list_screen_notes'),
      status: z.enum(['open', 'resolved']).optional().describe('New note status'),
      position: positionSchema.optional().describe('New normalized point position'),
      color: z.enum(noteColors).optional().describe('New note color')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('Updated note ID'),
      success: z.boolean().describe('Whether Zeplin accepted the update')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.status === undefined &&
      ctx.input.position === undefined &&
      ctx.input.color === undefined
    ) {
      throw createApiServiceError('Provide status, position, or color to update the note.');
    }
    let client = new ZeplinClient(ctx.auth.token);
    await client.updateScreenNote(ctx.input.projectId, ctx.input.screenId, ctx.input.noteId, {
      status: ctx.input.status,
      position: ctx.input.position,
      color: ctx.input.color
    });
    return {
      output: { noteId: ctx.input.noteId, success: true },
      message: `Updated note **${ctx.input.noteId}**.`
    };
  })
  .build();
