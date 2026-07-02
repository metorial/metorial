import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let listFilesTool = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List files in a course. Search by name, filter by content type, and sort by various fields. Returns file metadata including name, size, content type, and download URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      searchTerm: z.string().optional().describe('Partial file name to search for'),
      contentTypes: z
        .array(z.string())
        .optional()
        .describe('Filter by MIME types (e.g., ["application/pdf", "image/png"])'),
      sort: z
        .enum(['name', 'size', 'created_at', 'updated_at', 'content_type'])
        .optional()
        .describe('Sort field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      files: z.array(
        z.object({
          fileId: z.string().describe('File ID'),
          displayName: z.string().describe('Display name'),
          fileName: z.string().optional().describe('Original file name'),
          contentType: z.string().optional().describe('MIME type'),
          size: z.number().optional().describe('File size in bytes'),
          url: z.string().optional().describe('Download URL'),
          createdAt: z.string().optional().describe('Creation date'),
          updatedAt: z.string().optional().describe('Last modified date'),
          folderId: z.string().optional().describe('Parent folder ID'),
          locked: z.boolean().optional().describe('Whether the file is locked')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let raw = await client.listFiles(ctx.input.courseId, {
      searchTerm: ctx.input.searchTerm,
      contentTypes: ctx.input.contentTypes,
      sort: ctx.input.sort,
      order: ctx.input.order
    });

    let files = raw.map((f: any) => ({
      fileId: String(f.id),
      displayName: f.display_name,
      fileName: f.filename,
      contentType: f.content_type || f['content-type'],
      size: f.size,
      url: f.url,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      folderId: f.folder_id ? String(f.folder_id) : undefined,
      locked: f.locked
    }));

    return {
      output: { files },
      message: `Found **${files.length}** file(s) in course ${ctx.input.courseId}.`
    };
  })
  .build();
