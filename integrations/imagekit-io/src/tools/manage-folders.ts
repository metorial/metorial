import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid } from '../lib/validation';
import { spec } from '../spec';

export let manageFolders = SlateTool.create(spec, {
  name: 'Manage Folders',
  key: 'manage_folders',
  description: `Create, delete, copy, or move folders in the ImageKit Media Library. Copy and move operations on folders are asynchronous and return a job ID that can be checked with the returned bulk job ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['create', 'delete', 'copy', 'move'])
        .describe('Folder operation to perform'),
      folderName: z
        .string()
        .optional()
        .describe('Name of the folder to create (for create operation)'),
      parentFolderPath: z
        .string()
        .optional()
        .describe('Parent folder path for creating a folder, e.g. "/" or "/images/"'),
      folderPath: z
        .string()
        .optional()
        .describe('Path of the folder (for delete, copy, move operations)'),
      destinationPath: z
        .string()
        .optional()
        .describe('Destination path (for copy and move operations)'),
      includeVersions: z
        .boolean()
        .optional()
        .describe('Include file versions when copying a folder')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was initiated successfully'),
      jobId: z
        .string()
        .optional()
        .describe('Bulk job ID for async copy/move operations — use to check status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (
      ctx.input.operation !== 'create' &&
      (ctx.input.folderName !== undefined || ctx.input.parentFolderPath !== undefined)
    )
      throw invalid('folderName and parentFolderPath apply only to create.');
    if (
      ctx.input.operation === 'create' &&
      (ctx.input.folderPath !== undefined || ctx.input.destinationPath !== undefined)
    )
      throw invalid('folderPath and destinationPath do not apply to create.');
    if (
      !['copy', 'move'].includes(ctx.input.operation) &&
      ctx.input.destinationPath !== undefined
    )
      throw invalid('destinationPath applies only to copy and move.');
    if (ctx.input.operation !== 'copy' && ctx.input.includeVersions !== undefined)
      throw invalid('includeVersions applies only to copy.');
    if (ctx.input.operation === 'create') {
      if (!ctx.input.folderName || !ctx.input.parentFolderPath) {
        throw invalid('folderName and parentFolderPath are required for create operation');
      }
      await client.createFolder(ctx.input.folderName, ctx.input.parentFolderPath);

      return {
        output: { success: true },
        message:
          'ImageKit accepted folder creation. Names can be normalized and missing parent folders are created automatically.'
      };
    }

    if (ctx.input.operation === 'delete') {
      if (!ctx.input.folderPath) throw invalid('folderPath is required for delete operation');
      await client.deleteFolder(ctx.input.folderPath);

      return {
        output: { success: true },
        message: `Deleted folder \`${ctx.input.folderPath}\`.`
      };
    }

    if (ctx.input.operation === 'copy') {
      if (!ctx.input.folderPath || !ctx.input.destinationPath) {
        throw invalid('folderPath and destinationPath are required for copy operation');
      }
      let result = await client.copyFolder(
        ctx.input.folderPath,
        ctx.input.destinationPath,
        ctx.input.includeVersions
      );

      return {
        output: { success: true, jobId: result.jobId },
        message: `Copy folder job started: \`${ctx.input.folderPath}\` → \`${ctx.input.destinationPath}\`. Job ID: \`${result.jobId}\`.`
      };
    }

    if (ctx.input.operation === 'move') {
      if (!ctx.input.folderPath || !ctx.input.destinationPath) {
        throw invalid('folderPath and destinationPath are required for move operation');
      }
      let result = await client.moveFolder(ctx.input.folderPath, ctx.input.destinationPath);

      return {
        output: { success: true, jobId: result.jobId },
        message: `Move folder job started: \`${ctx.input.folderPath}\` → \`${ctx.input.destinationPath}\`. Job ID: \`${result.jobId}\`.`
      };
    }

    throw invalid(`Unknown operation: ${ctx.input.operation}`);
  })
  .build();
