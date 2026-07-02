import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNoteTool = SlateTool.create(spec, {
  name: 'Get Note',
  key: 'get_note',
  description: `Retrieve a note's full details including its ENML content, metadata, tags, and resource info. Use this to read a specific note by its GUID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      noteGuid: z.string().describe('GUID of the note to retrieve'),
      includeContent: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include the note body content (ENML)')
    })
  )
  .output(
    z.object({
      noteGuid: z.string().describe('Unique identifier of the note'),
      title: z.string().describe('Title of the note'),
      content: z.string().optional().describe('ENML content of the note'),
      notebookGuid: z.string().describe('GUID of the notebook containing this note'),
      tagGuids: z.array(z.string()).optional().describe('GUIDs of tags applied to this note'),
      tagNames: z.array(z.string()).optional().describe('Names of tags applied to this note'),
      createdAt: z.string().optional().describe('ISO timestamp when the note was created'),
      updatedAt: z
        .string()
        .optional()
        .describe('ISO timestamp when the note was last updated'),
      author: z.string().optional().describe('Author of the note'),
      sourceUrl: z.string().optional().describe('Source URL of the note'),
      active: z.boolean().optional().describe('Whether the note is active (not in trash)'),
      resources: z
        .array(
          z.object({
            resourceGuid: z.string().describe('GUID of the resource'),
            mime: z.string().optional().describe('MIME type of the resource'),
            fileName: z.string().optional().describe('Original filename of the resource'),
            width: z.number().optional().describe('Width in pixels (for images)'),
            height: z.number().optional().describe('Height in pixels (for images)')
          })
        )
        .optional()
        .describe('File attachments on this note')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    let note = await client.getNote(
      ctx.input.noteGuid,
      ctx.input.includeContent ?? true,
      false, // withResourcesData
      false, // withResourcesRecognition
      false // withResourcesAlternateData
    );

    let tagNames: string[] | undefined;
    if (note.tagGuids && note.tagGuids.length > 0) {
      try {
        tagNames = await client.getNoteTagNames(ctx.input.noteGuid);
      } catch {
        // Silently fail tag name lookup
      }
    }

    return {
      output: {
        noteGuid: note.noteGuid || '',
        title: note.title || '',
        content: note.content,
        notebookGuid: note.notebookGuid || '',
        tagGuids: note.tagGuids,
        tagNames,
        createdAt: note.created ? new Date(note.created).toISOString() : undefined,
        updatedAt: note.updated ? new Date(note.updated).toISOString() : undefined,
        author: note.attributes?.author,
        sourceUrl: note.attributes?.sourceUrl,
        active: note.active,
        resources: note.resources?.map(r => ({
          resourceGuid: r.resourceGuid || '',
          mime: r.mime,
          fileName: r.attributes?.fileName,
          width: r.width,
          height: r.height
        }))
      },
      message: `Retrieved note **${note.title}**.`
    };
  })
  .build();
