import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { dropboxServiceError } from '../lib/errors';
import { spec } from '../spec';

export let fileRevisions = SlateTool.create(spec, {
  name: 'File Revisions',
  key: 'file_revisions',
  description: `List or restore previous versions of a file. Use action "list" to see available revisions or "restore" to revert a file to a specific revision.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'restore'])
        .describe('Whether to list revisions or restore a specific one'),
      path: z.string().describe('Path of the file'),
      rev: z
        .string()
        .optional()
        .describe('Revision ID to restore (required for "restore" action)'),
      mode: z
        .enum(['path', 'id'])
        .optional()
        .describe(
          'For "list", whether to return revisions for the current path or stable file ID'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of revisions to return (for "list")')
    })
  )
  .output(
    z.object({
      revisions: z
        .array(
          z.object({
            rev: z.string().describe('Revision identifier'),
            name: z.string().describe('File name'),
            size: z.number().describe('File size in bytes'),
            serverModified: z.string().describe('Server modification timestamp'),
            clientModified: z.string().optional().describe('Client modification timestamp'),
            isDeleted: z
              .boolean()
              .optional()
              .describe('Whether this revision represents a deleted version')
          })
        )
        .optional()
        .describe('List of file revisions'),
      restored: z
        .object({
          name: z.string().describe('Restored file name'),
          pathDisplay: z.string().optional().describe('Display path'),
          rev: z.string().describe('New revision after restore'),
          size: z.number().describe('File size in bytes')
        })
        .optional()
        .describe('Details of the restored file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DropboxClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let result = await client.listRevisions(
        ctx.input.path,
        ctx.input.limit,
        ctx.input.mode ?? 'path'
      );
      let revisions = (result.entries || []).map((entry: any) => ({
        rev: entry.rev,
        name: entry.name,
        size: entry.size,
        serverModified: entry.server_modified,
        clientModified: entry.client_modified,
        isDeleted: entry.is_deleted
      }));

      return {
        output: { revisions },
        message: `Found **${revisions.length}** revisions for **${ctx.input.path}**.`
      };
    }

    // restore
    if (!ctx.input.rev) {
      throw dropboxServiceError('rev is required for restore.');
    }
    let result = await client.restoreRevision(ctx.input.path, ctx.input.rev);

    return {
      output: {
        restored: {
          name: result.name,
          pathDisplay: result.path_display,
          rev: result.rev,
          size: result.size
        }
      },
      message: `Restored **${result.name}** to revision **${ctx.input.rev}**.`
    };
  })
  .build();
