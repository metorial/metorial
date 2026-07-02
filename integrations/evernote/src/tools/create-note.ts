import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildEnmlContent, prepareNoteResources } from '../lib/note-content';
import { spec } from '../spec';

let noteResourceInputSchema = z.object({
  fileName: z.string().optional().describe('Original file name to store on the resource'),
  mimeType: z.string().describe('MIME type of the resource, such as text/plain'),
  contentBase64: z.string().describe('Base64-encoded resource bytes to attach')
});

export let createNoteTool = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Create a new note in Evernote. The content can be plain text or ENML (Evernote Markup Language, a subset of XHTML). If plain text or simple HTML is provided, it will be wrapped in the required ENML envelope automatically.`,
  instructions: [
    'If content does not start with "<?xml", it will be auto-wrapped in the ENML document envelope.',
    'Use tag names (not GUIDs) to assign tags — Evernote will create new tags automatically if they do not exist.',
    'When resources are provided, each resource is attached to the note and an en-media element is appended to the ENML body.'
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
      resources: z
        .array(noteResourceInputSchema)
        .optional()
        .describe('File resources to attach to the new note.'),
      author: z.string().optional().describe('Author of the note'),
      sourceUrl: z.string().optional().describe('Source URL for the note content')
    })
  )
  .output(
    z.object({
      noteGuid: z.string().describe('Unique identifier of the created note'),
      title: z.string().describe('Title of the created note'),
      notebookGuid: z.string().describe('GUID of the notebook the note was created in'),
      resources: z
        .array(
          z.object({
            resourceGuid: z.string().describe('GUID of the attached resource'),
            mime: z.string().optional().describe('MIME type of the resource'),
            fileName: z.string().optional().describe('Original file name')
          })
        )
        .optional()
        .describe('Resources attached to the created note'),
      resourceCount: z.number().describe('Number of resources attached to the note'),
      createdAt: z.string().describe('ISO timestamp when the note was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    let resources = prepareNoteResources(ctx.input.resources);
    let content = buildEnmlContent(ctx.input.content, resources);

    let note = await client.createNote({
      title: ctx.input.title,
      content,
      notebookGuid: ctx.input.notebookGuid,
      tagNames: ctx.input.tagNames,
      resources:
        resources.length > 0 ? resources.map(resource => resource.resource) : undefined,
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
        resources: note.resources?.map(resource => ({
          resourceGuid: resource.resourceGuid || '',
          mime: resource.mime,
          fileName: resource.attributes?.fileName
        })),
        resourceCount: note.resources?.length ?? resources.length,
        createdAt: note.created
          ? new Date(note.created).toISOString()
          : new Date().toISOString()
      },
      message: `Created note **${note.title}** in notebook \`${note.notebookGuid}\`.`
    };
  })
  .build();
