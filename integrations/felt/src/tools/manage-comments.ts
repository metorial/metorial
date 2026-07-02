import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageComments = SlateTool.create(spec, {
  name: 'Manage Comments',
  key: 'manage_comments',
  description: `Export, resolve, or delete comments on a Felt map. Use this to retrieve all comments in JSON, CSV, or GeoJSON format, resolve a specific comment thread, or permanently delete a comment.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map'),
      action: z.enum(['export', 'resolve', 'delete']).describe('Action to perform'),
      commentId: z
        .string()
        .optional()
        .describe('Comment ID (required for resolve and delete actions)'),
      exportFormat: z
        .enum(['json', 'csv', 'geojson'])
        .optional()
        .describe('Format for export (defaults to "json")')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action performed'),
      comments: z.unknown().nullable().describe('Exported comments (only for export action)'),
      commentId: z.string().nullable().describe('Affected comment ID (for resolve/delete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'export') {
      let format = ctx.input.exportFormat ?? 'json';
      let comments = await client.exportComments(ctx.input.mapId, format);
      return {
        output: { action: 'exported', comments, commentId: null },
        message: `Exported comments from map \`${ctx.input.mapId}\` in **${format}** format.`
      };
    }

    if (!ctx.input.commentId) {
      throw new Error('commentId is required for resolve and delete actions');
    }

    if (ctx.input.action === 'resolve') {
      await client.resolveComment(ctx.input.mapId, ctx.input.commentId);
      return {
        output: { action: 'resolved', comments: null, commentId: ctx.input.commentId },
        message: `Resolved comment \`${ctx.input.commentId}\`.`
      };
    }

    await client.deleteComment(ctx.input.mapId, ctx.input.commentId);
    return {
      output: { action: 'deleted', comments: null, commentId: ctx.input.commentId },
      message: `Deleted comment \`${ctx.input.commentId}\`.`
    };
  })
  .build();
