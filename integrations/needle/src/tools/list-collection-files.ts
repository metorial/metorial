import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let listCollectionFiles = SlateTool.create(spec, {
  name: 'List Collection Files',
  key: 'list_collection_files',
  description: `List files in a collection with pagination support. Returns file metadata including name, size, content type, and indexing status.`,
  constraints: ['Maximum of 500 files per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('ID of the collection to list files from'),
      offset: z.number().optional().describe('Number of files to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of files to return (max 500)')
    })
  )
  .output(
    z.object({
      files: z
        .array(
          z.object({
            fileId: z.string().describe('Unique identifier of the file'),
            name: z.string().describe('Name of the file'),
            size: z.number().optional().describe('File size in bytes'),
            contentType: z.string().optional().describe('MIME type of the file'),
            status: z
              .string()
              .optional()
              .describe('Indexing status: pending, indexed, or error'),
            createdAt: z.string().optional().describe('ISO timestamp when the file was added'),
            updatedAt: z
              .string()
              .optional()
              .describe('ISO timestamp when the file was last updated')
          })
        )
        .describe('List of files in the collection')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeedleClient(ctx.auth.token);
    let files = await client.listCollectionFiles(ctx.input.collectionId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let mapped = files.map(f => ({
      fileId: f.id,
      name: f.name,
      size: f.size,
      contentType: f.content_type,
      status: f.status,
      createdAt: f.created_at,
      updatedAt: f.updated_at
    }));

    return {
      output: { files: mapped },
      message: `Found **${mapped.length}** file(s) in collection \`${ctx.input.collectionId}\`.`
    };
  })
  .build();
