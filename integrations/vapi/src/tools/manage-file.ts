import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type VapiFile } from '../lib/client';
import { spec } from '../spec';

export const manageFile = SlateTool.create(spec, {
  name: 'Manage File',
  key: 'manage_file',
  description:
    'Upload a text knowledge-source file, retrieve file metadata, rename a file, or delete it. Use list_files to discover existing file IDs.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      action: z.enum(['upload', 'get', 'update', 'delete']),
      fileId: z
        .string()
        .optional()
        .describe('Required for get, update, and delete; discover IDs with list_files'),
      fileName: z
        .string()
        .optional()
        .describe('Filename including extension, required for upload'),
      content: z.string().optional().describe('Text content, required for upload'),
      name: z
        .string()
        .min(1)
        .max(40)
        .optional()
        .describe('New display name, required for update'),
      purpose: z
        .enum(['assistant', 'composer-attachment', 'knowledge-base-v2'])
        .optional()
        .describe('Product flow that owns the uploaded file')
    })
  )
  .output(
    z.object({
      fileId: z.string(),
      name: z.string().optional(),
      originalName: z.string().optional(),
      status: z.string().optional(),
      bytes: z.number().optional(),
      purpose: z.string().optional(),
      mimetype: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token, ctx.auth.region);
    let { action, fileId } = ctx.input;
    if (action !== 'upload' && !fileId)
      throw createApiServiceError('fileId is required. Use list_files to discover IDs.');
    if (action === 'delete') {
      await client.deleteFile(fileId!);
      return {
        output: { fileId: fileId!, deleted: true },
        message: `Deleted file ${fileId}.`
      };
    }
    let file: VapiFile;
    if (action === 'upload') {
      if (!ctx.input.fileName || ctx.input.content === undefined)
        throw createApiServiceError('Uploading a text file requires fileName and content.');
      let form = new FormData();
      form.append(
        'file',
        new Blob([ctx.input.content], { type: 'text/plain' }),
        ctx.input.fileName
      );
      if (ctx.input.purpose) form.append('purpose', ctx.input.purpose);
      file = await client.uploadFile(form);
    } else if (action === 'update') {
      if (!ctx.input.name)
        throw createApiServiceError('name is required for renaming a file.');
      file = await client.updateFile(fileId!, { name: ctx.input.name });
    } else file = await client.getFile(fileId!);
    return {
      output: {
        fileId: file.id,
        name: file.name,
        originalName: file.originalName,
        status: file.status,
        bytes: file.bytes,
        purpose: file.purpose,
        mimetype: file.mimetype,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt
      },
      message: `Completed ${action} for file ${file.name ?? file.originalName ?? file.id}.`
    };
  })
  .build();
