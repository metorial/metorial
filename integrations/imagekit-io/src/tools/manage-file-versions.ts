import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let versionSchema = z.object({
  fileId: z.string().describe('File ID'),
  versionId: z.string().describe('Version ID'),
  name: z.string().describe('File name'),
  filePath: z.string().optional().describe('File path'),
  url: z.string().optional().describe('CDN URL for this version'),
  size: z.number().optional().describe('File size in bytes'),
  fileType: z.string().optional().describe('File type'),
  createdAt: z.string().optional().describe('Version creation timestamp'),
  updatedAt: z.string().optional().describe('Version last update timestamp')
});

export let manageFileVersions = SlateTool.create(spec, {
  name: 'Manage File Versions',
  key: 'manage_file_versions',
  description: `List, get details, delete, or restore file versions. ImageKit maintains version history for files, allowing you to view previous versions and restore them.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['list', 'get', 'delete', 'restore'])
        .describe('Version operation to perform'),
      fileId: z.string().describe('File ID to operate on'),
      versionId: z
        .string()
        .optional()
        .describe('Version ID (required for get, delete, and restore)')
    })
  )
  .output(
    z.object({
      versions: z
        .array(versionSchema)
        .optional()
        .describe('List of file versions (for list operation)'),
      version: versionSchema
        .optional()
        .describe('Version details (for get/restore operations)'),
      deleted: z.boolean().optional().describe('Whether the version was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.operation === 'list') {
      let versions = await client.listFileVersions(ctx.input.fileId);
      let mapped = (versions as any[]).map((v: any) => ({
        fileId: v.fileId,
        versionId: v.versionInfo?.id || v.id,
        name: v.name,
        filePath: v.filePath,
        url: v.url,
        size: v.size,
        fileType: v.fileType,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt
      }));

      return {
        output: { versions: mapped },
        message: `Found **${mapped.length}** version(s) for file \`${ctx.input.fileId}\`.`
      };
    }

    if (ctx.input.operation === 'get') {
      if (!ctx.input.versionId) throw new Error('versionId is required for get operation');
      let v = await client.getFileVersionDetails(ctx.input.fileId, ctx.input.versionId);

      return {
        output: {
          version: {
            fileId: v.fileId,
            versionId: v.versionInfo?.id || v.id,
            name: v.name,
            filePath: v.filePath,
            url: v.url,
            size: v.size,
            fileType: v.fileType,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt
          }
        },
        message: `Retrieved version \`${ctx.input.versionId}\` of file \`${ctx.input.fileId}\`.`
      };
    }

    if (ctx.input.operation === 'delete') {
      if (!ctx.input.versionId) throw new Error('versionId is required for delete operation');
      await client.deleteFileVersion(ctx.input.fileId, ctx.input.versionId);

      return {
        output: { deleted: true },
        message: `Deleted version \`${ctx.input.versionId}\` of file \`${ctx.input.fileId}\`.`
      };
    }

    if (ctx.input.operation === 'restore') {
      if (!ctx.input.versionId) throw new Error('versionId is required for restore operation');
      let v = await client.restoreFileVersion(ctx.input.fileId, ctx.input.versionId);

      return {
        output: {
          version: {
            fileId: v.fileId,
            versionId: v.versionInfo?.id || v.id,
            name: v.name,
            filePath: v.filePath,
            url: v.url,
            size: v.size,
            fileType: v.fileType,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt
          }
        },
        message: `Restored version \`${ctx.input.versionId}\` of file \`${ctx.input.fileId}\`.`
      };
    }

    throw new Error(`Unknown operation: ${ctx.input.operation}`);
  })
  .build();
