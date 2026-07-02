import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { decodeDropboxContent } from '../lib/content';
import { dropboxServiceError } from '../lib/errors';
import { spec } from '../spec';

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Upload a file to Dropbox at the specified path. Supports text or base64 content, creating new files, overwriting existing files, or updating a specific revision.`,
  instructions: [
    'Use mode "add" to create a new file (fails if it exists), "overwrite" to replace existing content, or "update" to update a specific revision.'
  ],
  constraints: [
    'Maximum file size is 150 MB for single upload. For larger files, use upload sessions.',
    'Content should be text. Binary file uploads are not supported through this tool.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      path: z
        .string()
        .describe('Destination path including filename (e.g., "/Documents/notes.txt")'),
      content: z.string().describe('Text content to upload'),
      contentEncoding: z
        .enum(['text', 'base64'])
        .optional()
        .describe('How to decode content. Use "base64" for binary files. Defaults to "text".'),
      mode: z
        .enum(['add', 'overwrite', 'update'])
        .optional()
        .describe(
          'Upload mode: "add" creates new file, "overwrite" replaces existing, "update" overwrites only if rev matches'
        ),
      rev: z
        .string()
        .optional()
        .describe('Existing file revision required when mode is "update"'),
      autorename: z
        .boolean()
        .optional()
        .describe('If true, rename the file if a conflict exists'),
      mute: z.boolean().optional().describe('If true, suppress notifications for this upload'),
      contentHash: z
        .string()
        .optional()
        .describe('Optional Dropbox content hash to verify the uploaded bytes'),
      clientModified: z
        .string()
        .optional()
        .describe('Optional ISO timestamp to store as the client modified time')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Name of the uploaded file'),
      pathDisplay: z.string().optional().describe('Display path of the uploaded file'),
      fileId: z.string().optional().describe('Unique ID of the uploaded file'),
      size: z.number().describe('File size in bytes'),
      rev: z.string().describe('Revision of the uploaded file'),
      contentHash: z.string().optional().describe('Hash of the file content')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.mode === 'update' && !ctx.input.rev) {
      throw dropboxServiceError('rev is required when upload mode is "update".');
    }

    let client = new DropboxClient(ctx.auth.token);
    let content = decodeDropboxContent(ctx.input.content, ctx.input.contentEncoding ?? 'text');
    let result = await client.uploadFile(
      ctx.input.path,
      content,
      ctx.input.mode ?? 'add',
      ctx.input.autorename ?? false,
      ctx.input.mute ?? false,
      {
        rev: ctx.input.rev,
        contentHash: ctx.input.contentHash,
        clientModified: ctx.input.clientModified
      }
    );

    return {
      output: {
        name: result.name,
        pathDisplay: result.path_display,
        fileId: result.id,
        size: result.size,
        rev: result.rev,
        contentHash: result.content_hash
      },
      message: `Uploaded **${result.name}** (${result.size} bytes) to **${result.path_display}**.`
    };
  })
  .build();
