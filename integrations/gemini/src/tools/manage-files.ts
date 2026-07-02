import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let fileSchema = z.object({
  fileName: z.string().describe('Resource name of the file (e.g. "files/abc123")'),
  displayName: z.string().optional().describe('Display name of the file'),
  mimeType: z.string().optional().describe('MIME type of the file'),
  sizeBytes: z.string().optional().describe('File size in bytes'),
  createTime: z.string().optional().describe('File creation timestamp'),
  updateTime: z.string().optional().describe('File last update timestamp'),
  expirationTime: z
    .string()
    .optional()
    .describe('When the file will be automatically deleted (48 hours after upload)'),
  sha256Hash: z.string().optional().describe('SHA-256 hash of the file content'),
  uri: z.string().optional().describe('URI to reference this file in generation requests'),
  state: z
    .string()
    .optional()
    .describe('Processing state of the file (PROCESSING, ACTIVE, FAILED)')
});

let mapFile = (file: any) => ({
  fileName: file.name,
  displayName: file.displayName,
  mimeType: file.mimeType,
  sizeBytes: file.sizeBytes,
  createTime: file.createTime,
  updateTime: file.updateTime,
  expirationTime: file.expirationTime,
  sha256Hash: file.sha256Hash,
  uri: file.uri,
  state: file.state
});

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Upload a text, image, audio, video, or document file to the Gemini File API for reuse in generation requests. Returns the file URI needed for fileData parts in Generate Text and cached content workflows.`,
  instructions: [
    'Provide fileData as base64-encoded bytes and set the correct MIME type.',
    'Use the returned uri in generate_text messages with a fileData part.',
    'Files are temporary and should be deleted when no longer needed.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      displayName: z.string().optional().describe('Human-readable display name for the file'),
      mimeType: z.string().describe('MIME type of the file (e.g. "text/plain")'),
      fileData: z.string().describe('Base64-encoded file bytes')
    })
  )
  .output(fileSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.uploadFile({
      displayName: ctx.input.displayName,
      mimeType: ctx.input.mimeType,
      fileData: ctx.input.fileData
    });
    let file = mapFile(result.file ?? result);

    return {
      output: file,
      message: `Uploaded file **${file.displayName ?? file.fileName}** (${file.mimeType ?? ctx.input.mimeType}).`
    };
  })
  .build();

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List files previously uploaded to the Gemini File API. Files are stored for 48 hours and can be referenced in generation requests by their URI.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of files to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      files: z.array(fileSchema).describe('Uploaded files'),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listFiles({
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let files = (result.files ?? []).map(mapFile);

    return {
      output: {
        files,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${files.length}** uploaded file(s).`
    };
  })
  .build();

export let getFile = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Get metadata for a file previously uploaded to the Gemini File API. Returns file details including processing state, size, MIME type, and expiration time.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      fileName: z
        .string()
        .describe('Resource name or ID of the file (e.g. "files/abc123" or "abc123")')
    })
  )
  .output(fileSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let f = await client.getFile(ctx.input.fileName);

    let file = mapFile(f);

    return {
      output: file,
      message: `Retrieved file **${f.displayName ?? f.name}** (${f.mimeType ?? 'unknown type'}, state: ${f.state ?? 'unknown'}).`
    };
  })
  .build();

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete a file previously uploaded to the Gemini File API. The file will no longer be available for use in generation requests.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      fileName: z
        .string()
        .describe(
          'Resource name or ID of the file to delete (e.g. "files/abc123" or "abc123")'
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the file was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.deleteFile(ctx.input.fileName);

    return {
      output: { deleted: true },
      message: `Deleted file **${ctx.input.fileName}**.`
    };
  })
  .build();
