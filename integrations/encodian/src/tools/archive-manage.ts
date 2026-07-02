import { SlateTool } from 'slates';
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
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.operation === 'create') {
      let body: Record<string, any> = {
        outputFilename: ctx.input.outputFilename || 'archive.zip',
        files: ctx.input.files
      };
      if (ctx.input.archivePassword) body.Password = ctx.input.archivePassword;

      let result = await client.createZipArchive(body);

      return {
        output: {
          fileName: result.Filename,
          fileContent: result.FileContent,
          operationId: result.OperationId
        },
        message: `Successfully created ZIP archive with **${ctx.input.files?.length || 0} files**.`
      };
    } else {
      let body: Record<string, any> = {
        fileContent: ctx.input.fileContent
      };
      if (ctx.input.extractPassword) body.password = ctx.input.extractPassword;

      let result = await client.extractFromArchive(body);

      return {
        output: {
          documents: (result.documents || []).map((d: any) => ({
            fileName: d.fileName,
            fileContent: d.fileContent
          })),
          operationId: result.OperationId
        },
        message: `Successfully extracted **${result.documents?.length || 0} files** from ZIP archive.`
      };
    }
  })
  .build();
