import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { folderIdSchema, projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let importFile = SlateTool.create(spec, {
  name: 'Import File',
  key: 'import_file',
  description: `Import a file from a public URL into Dovetail as a note, data entry, insight, or document. Video and audio files will be automatically transcribed after upload. The URL must be publicly accessible and provide a direct file download.`,
  instructions: [
    'Provide a publicly accessible URL that directly downloads the file.',
    'If the URL lacks a file extension, provide the mimeType parameter.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      targetType: z
        .enum(['note', 'data', 'insight', 'doc'])
        .describe('What to create from the imported file'),
      url: z.string().describe('Public URL for direct file download'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type of the file (required if URL lacks file extension)'),
      title: z
        .string()
        .optional()
        .describe('Title for the imported resource (required for every targetType).'),
      projectId: projectIdSchema
        .optional()
        .describe(
          'Project ID from list_projects (required for note/data; optional for doc/insight).'
        ),
      folderId: folderIdSchema
        .optional()
        .describe(
          'Folder ID from browse_folders (doc/insight only; cannot combine with projectId).'
        )
    })
  )
  .output(
    z.object({
      resourceId: z.string(),
      resourceType: z.string(),
      title: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    if (!ctx.input.title)
      throw createApiServiceError('title is required for every file import.');
    if (
      ctx.input.folderId &&
      (ctx.input.targetType === 'note' || ctx.input.targetType === 'data')
    )
      throw createApiServiceError(
        'folderId is only supported for document and insight imports.'
      );
    if (ctx.input.projectId && ctx.input.folderId)
      throw createApiServiceError('Choose projectId or folderId, not both.');

    if (ctx.input.targetType === 'note') {
      if (!ctx.input.projectId)
        throw createApiServiceError('projectId is required for note file imports.');
      let note = await client.importNoteFromFile(
        ctx.input.url,
        ctx.input.title,
        ctx.input.projectId,
        ctx.input.mimeType
      );
      return {
        output: {
          resourceId: note.id,
          resourceType: 'note',
          title: note.title,
          createdAt: note.created_at
        },
        message: `Imported file as note **${note.title || note.id}**.`
      };
    }

    if (ctx.input.targetType === 'data') {
      if (!ctx.input.projectId)
        throw createApiServiceError('projectId is required for data file imports.');
      let data = await client.importDataFromFile(
        ctx.input.url,
        ctx.input.title,
        ctx.input.projectId,
        ctx.input.mimeType
      );
      return {
        output: {
          resourceId: data.id,
          resourceType: 'data',
          title: data.title,
          createdAt: data.created_at
        },
        message: `Imported file as data entry **${data.title || data.id}**.`
      };
    }

    if (ctx.input.targetType === 'insight') {
      let insight = await client.importInsightFromFile(
        ctx.input.url,
        ctx.input.title,
        ctx.input.mimeType,
        ctx.input.projectId,
        ctx.input.folderId
      );
      return {
        output: {
          resourceId: insight.id,
          resourceType: 'insight',
          title: insight.title,
          createdAt: insight.created_at
        },
        message: `Imported file as insight **${insight.title || insight.id}**.`
      };
    }

    // doc
    let doc = await client.importDocFromFile(
      ctx.input.url,
      ctx.input.title,
      ctx.input.mimeType,
      ctx.input.projectId,
      ctx.input.folderId
    );
    return {
      output: {
        resourceId: doc.id,
        resourceType: 'doc',
        title: doc.title,
        createdAt: doc.created_at
      },
      message: `Imported file as document **${doc.title || doc.id}**.`
    };
  })
  .build();
