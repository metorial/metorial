import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let archiveManage = SlateTool.create(spec, {
  name: 'Manage ZIP Archive',
  key: 'archive_manage',
  description: `Create or extract ZIP archive files. Create a ZIP archive from multiple files with optional folder structure and password protection, or extract files from an existing ZIP archive.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['create', 'extract'])
        .describe('Whether to create or extract a ZIP archive'),
      // Create params
      files: z
        .array(
          z.object({
            fileName: z.string().describe('Filename with extension'),
            fileContent: z.string().describe('Base64-encoded file content'),
            folderPath: z.string().optional().describe('Folder path within the archive')
          })
        )
        .optional()
        .describe('Files to include in the archive (for create)'),
      outputFilename: z.string().optional().describe('Output archive filename'),
      archivePassword: z.string().optional().describe('Password to protect the archive'),
      // Extract params
      fileContent: z
        .string()
        .optional()
        .describe('Base64-encoded ZIP archive content (for extract)'),
      extractPassword: z.string().optional().describe('Password to unlock the archive')
    })
  )
  .output(
    z.object({
      fileName: z.string().optional().describe('Output archive filename (for create)'),
      fileContent: z
        .string()
        .optional()
        .describe('Base64-encoded archive content (for create)'),
      documents: z
        .array(
          z.object({
            fileName: z.string().describe('Extracted filename'),
            fileContent: z.string().describe('Base64-encoded extracted file content')
          })
        )
        .optional()
        .describe('Extracted files (for extract)'),
      operationStatus: z.string().describe('Encodian operation status'),
      statusUrl: z.string().optional().describe('Status URL for a queued operation'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token, input => ctx.addAttachment(input));

    if (ctx.input.operation === 'create') {
      if (!ctx.input.files?.length)
        throw createApiServiceError('Provide files to create an archive.');
      let body: Record<string, any> = {
        outputFilename: ctx.input.outputFilename || 'archive.zip',
        documents: ctx.input.files,
        FinalOperation: true
      };
      if (ctx.input.archivePassword) body.Password = ctx.input.archivePassword;

      let result = await client.createZipArchive(body);

      return {
        output: {
          fileName: result.Filename,
          fileContent: result.FileContent,
          operationStatus: client.operationStatus,
          statusUrl: client.statusUrl,
          operationId: result.OperationId
        },
        message: client.message(
          `Successfully created ZIP archive with **${ctx.input.files?.length || 0} files**.`
        )
      };
    } else {
      if (!ctx.input.fileContent?.trim())
        throw createApiServiceError('fileContent is required to extract an archive.');
      let body: Record<string, any> = {
        fileContent: ctx.input.fileContent,
        pathSeparator: 'ForwardSlash',
        recursive: true
      };
      if (ctx.input.extractPassword) body.password = ctx.input.extractPassword;

      let result = await client.extractFromArchive(body);

      return {
        output: {
          documents: (result.documents || []).map((d: any) => ({
            fileName: d.fileName,
            fileContent: d.fileContent
          })),
          operationStatus: client.operationStatus,
          statusUrl: client.statusUrl,
          operationId: result.OperationId
        },
        message: client.message(
          `Successfully extracted **${result.documents?.length || 0} files** from ZIP archive.`
        )
      };
    }
  })
  .build();
