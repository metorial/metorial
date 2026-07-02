import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let manageDbfs = SlateTool.create(spec, {
  name: 'Manage DBFS',
  key: 'manage_dbfs',
  description: `Interact with the Databricks File System (DBFS). List, read, upload, create directories, and delete files or folders.`,
  instructions: [
    'File content for upload must be base64-encoded.',
    'Read returns base64-encoded file content.',
    'Use Unity Catalog Volumes for governed file management where possible.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'read', 'put', 'mkdirs', 'delete']).describe('DBFS operation'),
      path: z.string().describe('DBFS path (e.g., "/mnt/data/file.csv")'),
      content: z.string().optional().describe('Base64-encoded file content (for put)'),
      overwrite: z.boolean().optional().describe('Overwrite existing file (for put)'),
      recursive: z.boolean().optional().describe('Delete recursively (for delete)'),
      offset: z.number().optional().describe('Byte offset for read'),
      length: z.number().optional().describe('Number of bytes to read')
    })
  )
  .output(
    z.object({
      files: z
        .array(
          z.object({
            path: z.string().describe('File path'),
            isDir: z.boolean().describe('Whether the item is a directory'),
            fileSize: z.number().optional().describe('File size in bytes')
          })
        )
        .optional()
        .describe('Files listed at the path'),
      content: z.string().optional().describe('Base64-encoded file content (for read)'),
      bytesRead: z.number().optional().describe('Number of bytes read'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list': {
        let files = await client.dbfsList(ctx.input.path);
        let mapped = files.map((f: any) => ({
          path: f.path,
          isDir: f.is_dir ?? false,
          fileSize: f.file_size
        }));
        return {
          output: { files: mapped, success: true },
          message: `Found **${mapped.length}** item(s) at \`${ctx.input.path}\`.`
        };
      }
      case 'read': {
        let result = await client.dbfsRead(ctx.input.path, ctx.input.offset, ctx.input.length);
        return {
          output: {
            content: result.data,
            bytesRead: result.bytes_read,
            success: true
          },
          message: `Read **${result.bytes_read ?? 0}** bytes from \`${ctx.input.path}\`.`
        };
      }
      case 'put': {
        if (!ctx.input.content) throw new Error('content is required for put');
        await client.dbfsPut(ctx.input.path, ctx.input.content, ctx.input.overwrite);
        return {
          output: { success: true },
          message: `Uploaded file to \`${ctx.input.path}\`.`
        };
      }
      case 'mkdirs': {
        await client.dbfsMkdirs(ctx.input.path);
        return {
          output: { success: true },
          message: `Created directory \`${ctx.input.path}\`.`
        };
      }
      case 'delete': {
        await client.dbfsDelete(ctx.input.path, ctx.input.recursive);
        return {
          output: { success: true },
          message: `Deleted \`${ctx.input.path}\`${ctx.input.recursive ? ' (recursive)' : ''}.`
        };
      }
    }
  })
  .build();
