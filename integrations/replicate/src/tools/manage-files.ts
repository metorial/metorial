import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { replicateServiceError } from '../lib/errors';
import { spec } from '../spec';

let fileOutputSchema = z.object({
  fileId: z.string().describe('File ID'),
  contentType: z.string().optional().describe('MIME type'),
  size: z.number().optional().describe('File size in bytes'),
  checksums: z
    .record(z.string(), z.string())
    .optional()
    .describe('File checksums (sha256, md5)'),
  metadata: z.record(z.string(), z.any()).optional().describe('File metadata'),
  createdAt: z.string().optional().describe('Upload timestamp'),
  expiresAt: z.string().optional().describe('Expiration timestamp'),
  url: z.string().optional().describe('URL to reference this file')
});

export let createFile = SlateTool.create(spec, {
  name: 'Create File',
  key: 'create_file',
  description: `Upload a file to Replicate for use as model input. Files expire after 24 hours.`,
  constraints: [
    'Maximum file size is 100MiB.',
    'Provide exactly one of contentBase64 or contentText.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      filename: z.string().describe('Filename to store with the uploaded file'),
      contentType: z
        .string()
        .optional()
        .describe('MIME type for the file content; defaults to application/octet-stream'),
      contentBase64: z
        .string()
        .optional()
        .describe('Base64-encoded file content for binary uploads'),
      contentText: z.string().optional().describe('Plain text file content'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('User-provided metadata associated with the file')
    })
  )
  .output(fileOutputSchema)
  .handleInvocation(async ctx => {
    let hasBase64 = ctx.input.contentBase64 !== undefined;
    let hasText = ctx.input.contentText !== undefined;

    if (hasBase64 === hasText) {
      throw replicateServiceError('Provide exactly one of contentBase64 or contentText.');
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.createFile({
      filename: ctx.input.filename,
      contentType: ctx.input.contentType,
      contentBase64: ctx.input.contentBase64,
      contentText: ctx.input.contentText,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        fileId: result.id,
        contentType: result.content_type,
        size: result.size,
        checksums: result.checksums,
        metadata: result.metadata,
        createdAt: result.created_at,
        expiresAt: result.expires_at,
        url: result.urls?.get
      },
      message: `Uploaded file **${ctx.input.filename}** as **${result.id}**.`
    };
  })
  .build();

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
          contentType: z.string().optional().describe('MIME type'),
          size: z.number().optional().describe('File size in bytes'),
          metadata: z.record(z.string(), z.any()).optional().describe('File metadata'),
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
      contentType: f.content_type,
      size: f.size,
      metadata: f.metadata,
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
      contentType: z.string().optional().describe('MIME type'),
      size: z.number().optional().describe('File size in bytes'),
      checksums: z
        .record(z.string(), z.string())
        .optional()
        .describe('File checksums (sha256, md5)'),
      metadata: z.record(z.string(), z.any()).optional().describe('File metadata'),
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
        contentType: result.content_type,
        size: result.size,
        checksums: result.checksums,
        metadata: result.metadata,
        createdAt: result.created_at,
        expiresAt: result.expires_at,
        url: result.urls?.get
      },
      message: `File **${result.id}** — ${result.content_type}, ${result.size} bytes, expires ${result.expires_at}.`
    };
  })
  .build();

export let downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description: `Download a Replicate file through a signed file download URL. Returns the file content as a Slate attachment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to download'),
      owner: z.string().describe('File owner from the signed download URL'),
      expiry: z.string().describe('Access expiry value from the signed download URL'),
      signature: z.string().describe('Signature value from the signed download URL')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Downloaded file ID'),
      contentType: z.string().describe('Downloaded content MIME type'),
      size: z.number().describe('Downloaded content size in bytes'),
      attachmentCount: z.number().describe('Number of file attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.downloadFile(ctx.input.fileId, {
      owner: ctx.input.owner,
      expiry: ctx.input.expiry,
      signature: ctx.input.signature
    });

    return {
      output: {
        fileId: ctx.input.fileId,
        contentType: result.contentType,
        size: result.size,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(result.contentBase64, result.contentType)],
      message: `Downloaded file **${ctx.input.fileId}** (${result.size} bytes).`
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
