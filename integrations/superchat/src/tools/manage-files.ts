import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let fileSchema = z.object({
  fileId: z.string().describe('Unique file identifier'),
  fileUrl: z.string().optional().describe('Resource URL'),
  name: z.string().optional().describe('File name'),
  mimeType: z.string().optional().describe('File MIME type'),
  size: z.number().optional().describe('File size in bytes'),
  createdAt: z.string().optional().describe('Upload timestamp')
});

let mapFile = (file: any) => ({
  fileId: file.id,
  fileUrl: file.url,
  name: file.name,
  mimeType: file.mime_type,
  size: file.size,
  createdAt: file.created_at
});

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List uploaded files in the workspace. Files can be used as message attachments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of files to return'),
      after: z.string().optional().describe('Cursor for forward pagination'),
      before: z.string().optional().describe('Cursor for backward pagination')
    })
  )
  .output(
    z.object({
      files: z.array(fileSchema).describe('List of files'),
      pagination: z
        .object({
          next: z.string().optional().nullable().describe('Next page cursor'),
          previous: z.string().optional().nullable().describe('Previous page cursor')
        })
        .optional()
        .describe('Pagination cursors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });

    let result = await client.listFiles({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let files = (result.results || []).map(mapFile);

    return {
      output: {
        files,
        pagination: result.pagination
      },
      message: `Retrieved **${files.length}** file(s).`
    };
  })
  .build();

export let getFile = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve details of a specific uploaded file by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to retrieve')
    })
  )
  .output(fileSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.getFile(ctx.input.fileId);

    return {
      output: mapFile(result),
      message: `Retrieved file **${result.name || result.id}** (${result.mime_type}).`
    };
  })
  .build();

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete an uploaded file. This cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to delete')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the deleted file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    await client.deleteFile(ctx.input.fileId);

    return {
      output: {
        fileId: ctx.input.fileId
      },
      message: `File \`${ctx.input.fileId}\` deleted.`
    };
  })
  .build();
