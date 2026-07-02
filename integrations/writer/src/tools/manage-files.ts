import { SlateTool } from 'slates';
import { z } from 'zod';
import { WriterClient } from '../lib/client';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List files uploaded to Writer. Returns file metadata including ID, name, status, and associated Knowledge Graph IDs. Supports pagination and ordering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderBy: z.enum(['created_at', 'name']).optional().describe('Field to sort by'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of files to return')
    })
  )
  .output(
    z.object({
      files: z
        .array(
          z.object({
            fileId: z.string().describe('Unique file ID'),
            name: z.string().describe('File name'),
            createdAt: z.string().describe('Upload timestamp'),
            graphIds: z.array(z.string()).describe('Associated Knowledge Graph IDs'),
            status: z.string().describe('Processing status')
          })
        )
        .describe('List of files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Listing files...');
    let files = await client.listFiles({
      orderBy: ctx.input.orderBy,
      order: ctx.input.order,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    return {
      output: { files },
      message: `Found **${files.length}** file(s)`
    };
  })
  .build();

export let getFile = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve metadata for a specific file by its ID, including the file name, processing status, and associated Knowledge Graphs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to retrieve')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Unique file ID'),
      name: z.string().describe('File name'),
      createdAt: z.string().describe('Upload timestamp'),
      graphIds: z.array(z.string()).describe('Associated Knowledge Graph IDs'),
      status: z.string().describe('Processing status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Retrieving file...');
    let result = await client.getFile(ctx.input.fileId);

    return {
      output: result,
      message: `Retrieved file **${result.name}** (status: \`${result.status}\`)`
    };
  })
  .build();

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Permanently delete a file from Writer. The file will be disassociated from all Knowledge Graphs. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Deleting file...');
    await client.deleteFile(ctx.input.fileId);

    return {
      output: { deleted: true },
      message: `Deleted file \`${ctx.input.fileId}\``
    };
  })
  .build();

export let downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description: `Download the content of a file by its ID. Returns the file content as text.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to download')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the downloaded file'),
      content: z.string().describe('File content as text')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Downloading file...');
    let content = await client.downloadFile(ctx.input.fileId);

    return {
      output: {
        fileId: ctx.input.fileId,
        content
      },
      message: `Downloaded file \`${ctx.input.fileId}\` (${content.length} characters)`
    };
  })
  .build();
