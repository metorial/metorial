import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNote = SlateTool.create(spec, {
  name: 'Get Note',
  key: 'get_note',
  description: `Retrieve a note by its ID, including its full content. Supports markdown, HTML, or Slite's internal format. Can also fetch child notes of any note for navigation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      noteId: z.string().describe('ID of the note to retrieve'),
      format: z
        .enum(['md', 'html', 'sliteml'])
        .optional()
        .default('md')
        .describe('Content format to return: md (Markdown), html, or sliteml'),
      includeChildren: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch and return child notes')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the note'),
      title: z.string().describe('Title of the note'),
      content: z.string().describe('Note content in the requested format'),
      url: z.string().describe('URL to view the note in Slite'),
      parentNoteId: z.string().nullable().describe('ID of the parent note'),
      updatedAt: z.string().describe('Timestamp of last update'),
      lastEditedAt: z.string().describe('Timestamp of last content edit'),
      archivedAt: z
        .string()
        .nullable()
        .describe('Timestamp when the note was archived, or null'),
      reviewState: z
        .string()
        .optional()
        .describe(
          'Review state: Verified, Outdated, VerificationRequested, or VerificationExpired'
        ),
      owner: z
        .object({
          userId: z.string().optional(),
          groupId: z.string().optional()
        })
        .optional()
        .describe('Owner of the note'),
      children: z
        .array(
          z.object({
            noteId: z.string(),
            title: z.string(),
            url: z.string()
          })
        )
        .optional()
        .describe('Child notes if includeChildren was true')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let note = await client.getNote(ctx.input.noteId, ctx.input.format);

    let children: Array<{ noteId: string; title: string; url: string }> | undefined;
    if (ctx.input.includeChildren) {
      let childrenResult = await client.getNoteChildren(ctx.input.noteId);
      children = childrenResult.notes.map((child: any) => ({
        noteId: child.id,
        title: child.title,
        url: child.url
      }));
    }

    return {
      output: {
        noteId: note.id,
        title: note.title,
        content: note.content,
        url: note.url,
        parentNoteId: note.parentNoteId ?? null,
        updatedAt: note.updatedAt,
        lastEditedAt: note.lastEditedAt,
        archivedAt: note.archivedAt ?? null,
        reviewState: note.reviewState,
        owner: note.owner,
        children
      },
      message: `Retrieved note **${note.title}**${children ? ` with ${children.length} child note(s)` : ''}`
    };
  })
  .build();
