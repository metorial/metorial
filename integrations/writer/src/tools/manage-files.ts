import { Buffer } from 'node:buffer';
import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WriterClient } from '../lib/client';
import {
  fileIdSchema,
  fileOutput,
  graphIdSchema,
  paginationInput,
  paginationOutput
} from '../lib/schemas';
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
      ...paginationInput,
      orderBy: z
        .enum(['created_at', 'name'])
        .optional()
        .describe(
          'Legacy ordering field. Writer supports created_at only; omit this field for cursor pagination.'
        ),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Legacy offset, implemented by walking pages. Prefer after or before.'),
      graphId: graphIdSchema
        .optional()
        .describe(
          'Filter files belonging to this Knowledge Graph. Call list_knowledge_graphs to discover IDs.'
        ),
      status: z
        .enum(['in_progress', 'completed', 'failed'])
        .optional()
        .describe('Filter by processing status.'),
      fileTypes: z
        .string()
        .optional()
        .describe('Comma-separated extensions, for example pdf,txt,docx.')
    })
  )
  .output(
    z.object({
      files: z.array(fileOutput).describe('List of files'),
      ...paginationOutput
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Listing files...');
    let page = await client.listFiles(ctx.input);
    let files = page.data;

    return {
      output: { files, hasMore: page.hasMore, firstId: page.firstId, lastId: page.lastId },
      message: `Found **${files.length}** file(s)`
    };
  })
  .build();

export let getFile = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve metadata for a file discovered with list_files, including the file name, processing status, and associated Knowledge Graphs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: fileIdSchema
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
  description: `Permanently delete a file discovered with list_files. The file will be disassociated from all Knowledge Graphs. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      fileId: fileIdSchema
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
  description: `DEPRECATED — use \`download_original_file\` instead. Download the content of a file by its ID as text.`,
  instructions: [
    'Use download_original_file for a downloadable file that preserves binary content.'
  ],
  tags: {
    readOnly: true,
    deprecated: true
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

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description:
    'Upload a text or binary file to Writer for Knowledge Graphs or agent inputs. Optionally associate it with a graph. Retrieve the file afterward to confirm the graph association.',
  tags: { destructive: false }
})
  .input(
    z.object({
      fileName: z
        .string()
        .min(1)
        .describe(
          'File name with a supported extension, for example notes.txt or report.pdf.'
        ),
      content: z
        .string()
        .describe('UTF-8 text or base64-encoded file bytes, depending on contentEncoding.'),
      contentEncoding: z
        .enum(['text', 'base64'])
        .default('text')
        .describe('Use text for UTF-8 content and base64 for binary files.'),
      contentType: z
        .string()
        .min(1)
        .default('text/plain')
        .describe('MIME type of the uploaded file.'),
      graphId: graphIdSchema
        .optional()
        .describe('Optional graph ID. Call list_knowledge_graphs to discover IDs.')
    })
  )
  .output(fileOutput)
  .handleInvocation(async ctx => {
    if (/[\r\n"\\/]/.test(ctx.input.fileName) || /[^\x20-\x7e]/.test(ctx.input.fileName)) {
      throw createApiServiceError(
        'Use a printable ASCII filename without quotes, slashes, or line breaks.'
      );
    }
    if (/[\r\n]/.test(ctx.input.contentType)) {
      throw createApiServiceError('contentType must be a MIME type without line breaks.');
    }
    if (
      ctx.input.contentEncoding === 'base64' &&
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        ctx.input.content
      )
    ) {
      throw createApiServiceError(
        'content must contain valid padded base64 when contentEncoding is base64.'
      );
    }
    let content = Buffer.from(
      ctx.input.content,
      ctx.input.contentEncoding === 'base64' ? 'base64' : 'utf8'
    );
    if (!content.byteLength)
      throw createApiServiceError('The file must contain at least one byte.');
    let client = new WriterClient(ctx.auth.token);
    let file = await client.uploadFile(
      ctx.input.fileName,
      content,
      ctx.input.contentType,
      ctx.input.graphId
    );
    return { output: file, message: `Uploaded **${file.name}** (ID: \`${file.fileId}\`).` };
  })
  .build();

export let downloadOriginalFile = SlateTool.create(spec, {
  name: 'Download Original File',
  key: 'download_original_file',
  description:
    'Prepare an uploaded Writer file discovered with list_files for download, preserving the original binary content.',
  tags: { readOnly: true }
})
  .input(z.object({ fileId: fileIdSchema }))
  .output(fileOutput)
  .handleInvocation(async ctx => {
    let file = await new WriterClient(ctx.auth.token).getFile(ctx.input.fileId);
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.writer.com/v1/files/${encodeURIComponent(ctx.input.fileId)}/download`,
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      filename: file.name
    });
    return { output: file, message: `Prepared **${file.name}** for download.` };
  })
  .build();
