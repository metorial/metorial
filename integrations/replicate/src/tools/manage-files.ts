import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List files that have been uploaded to Replicate. Files are used as inputs to models (images, audio, documents, etc.).`,
  constraints: ['Files expire 24 hours after upload.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      files: z.array(
        z.object({
          fileId: z.string().describe('File ID'),
          fileName: z.string().optional().describe('File name'),
          contentType: z.string().optional().describe('MIME type'),
          size: z.number().optional().describe('File size in bytes'),
          createdAt: z.string().optional().describe('Upload timestamp'),
          expiresAt: z.string().optional().describe('Expiration timestamp'),
          url: z.string().optional().describe('URL to reference this file')
        })
      ),
      nextCursor: z.string().optional().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listFiles({ cursor: ctx.input.cursor });

    let files = (result.results || []).map((f: any) => ({
      fileId: f.id,
      fileName: f.name,
      contentType: f.content_type,
      size: f.size,
      createdAt: f.created_at,
      expiresAt: f.expires_at,
      url: f.urls?.get
    }));

    let nextCursor = result.next ? new URL(result.next).searchParams.get('cursor') : null;

    return {
      output: { files, nextCursor },
      message: `Found **${files.length}** files.`
    };
  })
  .build();

export let getFile = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Get metadata for a specific uploaded file, including its size, type, checksums, and expiration time.`,
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
      fileId: z.string().describe('File ID'),
      fileName: z.string().optional().describe('File name'),
      contentType: z.string().optional().describe('MIME type'),
      size: z.number().optional().describe('File size in bytes'),
      checksums: z
        .record(z.string(), z.string())
        .optional()
        .describe('File checksums (sha256, md5)'),
      createdAt: z.string().optional().describe('Upload timestamp'),
      expiresAt: z.string().optional().describe('Expiration timestamp'),
      url: z.string().optional().describe('URL to reference this file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getFile(ctx.input.fileId);

    return {
      output: {
        fileId: result.id,
        fileName: result.name,
        contentType: result.content_type,
        size: result.size,
        checksums: result.checksums,
        createdAt: result.created_at,
        expiresAt: result.expires_at,
        url: result.urls?.get
      },
      message: `File **${result.name}** — ${result.content_type}, ${result.size} bytes, expires ${result.expires_at}.`
    };
  })
  .build();

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete an uploaded file from Replicate.`,
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
      fileId: z.string().describe('ID of the deleted file'),
      deleted: z.boolean().describe('Whether the file was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteFile(ctx.input.fileId);

    return {
      output: {
        fileId: ctx.input.fileId,
        deleted: true
      },
      message: `File **${ctx.input.fileId}** deleted.`
    };
  })
  .build();
