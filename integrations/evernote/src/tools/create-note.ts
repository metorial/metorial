import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let wrapInEnml = (content: string): string => {
  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${content}</en-note>`;
};

export let createNoteTool = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Create a new note in Evernote. The content can be plain text or ENML (Evernote Markup Language, a subset of XHTML). If plain text or simple HTML is provided, it will be wrapped in the required ENML envelope automatically.`,
  instructions: [
    'If content does not start with "<?xml", it will be auto-wrapped in the ENML document envelope.',
    'Use tag names (not GUIDs) to assign tags — Evernote will create new tags automatically if they do not exist.'
  ],
  constraints: [
    'Note title must be between 1 and 255 characters.',
    'ENML content must be valid — only a subset of HTML is allowed (no scripts, forms, etc.).'
  ]
})
  .input(
    z.object({
      title: z.string().describe('Title of the note (1-255 characters)'),
      content: z
        .string()
        .describe(
          'Note body content. Plain text, HTML fragment, or full ENML. Auto-wrapped in ENML envelope if needed.'
        ),
      notebookGuid: z
        .string()
        .optional()
        .describe(
          'GUID of the notebook to create the note in. Uses default notebook if omitted.'
        ),
      tagNames: z
        .array(z.string())
        .optional()
        .describe(
          'Tag names to apply to the note. New tags will be created if they do not exist.'
        ),
      author: z.string().optional().describe('Author of the note'),
      sourceUrl: z.string().optional().describe('Source URL for the note content')
    })
  )
  .output(
    z.object({
      noteGuid: z.string().describe('Unique identifier of the created note'),
      title: z.string().describe('Title of the created note'),
      notebookGuid: z.string().describe('GUID of the notebook the note was created in'),
      createdAt: z.string().describe('ISO timestamp when the note was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    let content = ctx.input.content;
    if (!content.startsWith('<?xml')) {
      content = wrapInEnml(content);
    }

    let note = await client.createNote({
      title: ctx.input.title,
      content,
      notebookGuid: ctx.input.notebookGuid,
      tagNames: ctx.input.tagNames,
      attributes:
        ctx.input.author || ctx.input.sourceUrl
          ? {
              author: ctx.input.author,
              sourceUrl: ctx.input.sourceUrl
            }
          : undefined
    });

    return {
      output: {
        noteGuid: note.noteGuid || '',
        title: note.title || '',
        notebookGuid: note.notebookGuid || '',
        createdAt: note.created
          ? new Date(note.created).toISOString()
          : new Date().toISOString()
      },
      message: `Created note **${note.title}** in notebook \`${note.notebookGuid}\`.`
    };
  })
  .build();
