import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      title: z.string().optional().describe('Title for the imported resource (insight only)'),
      projectId: z
        .string()
        .optional()
        .describe('Project to associate the import with (data only)')
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

    if (ctx.input.targetType === 'note') {
      let note = await client.importNoteFromFile(ctx.input.url, ctx.input.mimeType);
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
      let data = await client.importDataFromFile(
        ctx.input.url,
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
        ctx.input.mimeType
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
    let doc = await client.importDocFromFile(ctx.input.url, ctx.input.mimeType);
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
