import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let downloadOutputSchema = z.object({
  downloadId: z.string().describe('Download identifier'),
  sessionId: z.string().describe('Session ID that owns the download'),
  filename: z.string().describe('Downloaded filename'),
  mimeType: z.string().describe('MIME type'),
  size: z.number().describe('File size in bytes'),
  checksum: z.string().describe('SHA256 checksum'),
  createdAt: z.string().describe('Download timestamp')
});

export let listDownloads = SlateTool.create(spec, {
  name: 'List Downloads',
  key: 'list_downloads',
  description: `List Browserbase downloads for a session with optional filtering by filename, MIME type, size, creation time, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('Session ID to list downloads for'),
      filename: z.string().optional().describe('Filter by exact filename match'),
      mimeType: z.string().optional().describe('Filter by MIME type'),
      minSize: z.number().min(0).optional().describe('Minimum file size in bytes'),
      maxSize: z.number().min(0).optional().describe('Maximum file size in bytes'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter downloads created after this ISO timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter downloads created before this ISO timestamp'),
      limit: z.number().int().min(1).max(100).optional().describe('Maximum results to return'),
      offset: z.number().int().min(0).optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      downloads: z.array(downloadOutputSchema).describe('Matching downloads'),
      total: z.number().describe('Total count of matching downloads'),
      limit: z.number().describe('Page size used by Browserbase'),
      offset: z.number().describe('Pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listDownloads({
      sessionId: ctx.input.sessionId,
      filename: ctx.input.filename,
      mimeType: ctx.input.mimeType,
      minSize: ctx.input.minSize,
      maxSize: ctx.input.maxSize,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: result,
      message: `Found **${result.downloads.length}** download(s) for session **${ctx.input.sessionId}**.`
    };
  })
  .build();

export let getDownload = SlateTool.create(spec, {
  name: 'Get Download',
  key: 'get_download',
  description: `Retrieve Browserbase download metadata, and optionally return the downloaded file bytes as a Slate attachment.`,
  instructions: [
    'Set includeContent to true to receive file bytes through response attachments.',
    'File bytes are never returned inline in output fields.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      downloadId: z.string().describe('Download ID to retrieve'),
      includeContent: z
        .boolean()
        .optional()
        .describe('When true, return file bytes through a Slate attachment.')
    })
  )
  .output(
    downloadOutputSchema.extend({
      attachmentCount: z
        .number()
        .describe('Number of Slate attachments returned for downloaded file content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.includeContent) {
      let download = await client.getDownloadContent(ctx.input.downloadId);
      return {
        output: {
          downloadId: download.downloadId,
          sessionId: download.sessionId,
          filename: download.filename,
          mimeType: download.mimeType,
          size: download.size,
          checksum: download.checksum,
          createdAt: download.createdAt,
          attachmentCount: 1
        },
        attachments: [createBase64Attachment(download.contentBase64, download.mimeType)],
        message: `Retrieved download **${download.filename}** as a Slate attachment.`
      };
    }

    let download = await client.getDownload(ctx.input.downloadId);
    return {
      output: {
        downloadId: download.downloadId,
        sessionId: download.sessionId,
        filename: download.filename,
        mimeType: download.mimeType,
        size: download.size,
        checksum: download.checksum,
        createdAt: download.createdAt,
        attachmentCount: 0
      },
      message: `Retrieved download **${download.filename}** metadata.`
    };
  })
  .build();

export let deleteDownload = SlateTool.create(spec, {
  name: 'Delete Download',
  key: 'delete_download',
  description: `Delete a Browserbase download file from storage and mark it as deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      downloadId: z.string().describe('Download ID to delete')
    })
  )
  .output(
    z.object({
      downloadId: z.string().describe('Deleted download ID'),
      deleted: z.boolean().describe('Whether deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteDownload(ctx.input.downloadId);

    return {
      output: {
        downloadId: ctx.input.downloadId,
        deleted: true
      },
      message: `Deleted download **${ctx.input.downloadId}**.`
    };
  })
  .build();
