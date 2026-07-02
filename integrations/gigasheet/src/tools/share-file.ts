import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let shareFile = SlateTool.create(spec, {
  name: 'Share File',
  key: 'share_file',
  description: `Share a Gigasheet file with other users via email, or create a live share link that produces CSV data. Supports setting permissions and managing live shares.`
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the file to share'),
      action: z
        .enum([
          'share_with_users',
          'create_live_share',
          'list_live_shares',
          'delete_live_share'
        ])
        .describe('Sharing action to perform'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to share with (for share_with_users)'),
      permission: z
        .string()
        .optional()
        .describe('Permission level to grant (for share_with_users)'),
      shareMessage: z
        .string()
        .optional()
        .describe('Optional message to include with the share invitation'),
      liveShareId: z
        .string()
        .optional()
        .describe('Live share ID to delete (for delete_live_share)')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('Sharing operation result'),
      success: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });
    let result: unknown;

    switch (ctx.input.action) {
      case 'share_with_users':
        if (!ctx.input.emails || ctx.input.emails.length === 0) {
          throw new Error('emails is required for share_with_users');
        }
        result = await client.shareFile(ctx.input.sheetHandle, {
          emails: ctx.input.emails,
          permission: ctx.input.permission,
          message: ctx.input.shareMessage
        });
        break;

      case 'create_live_share':
        result = await client.createLiveShare(ctx.input.sheetHandle);
        break;

      case 'list_live_shares':
        result = await client.listLiveShares(ctx.input.sheetHandle);
        break;

      case 'delete_live_share':
        if (!ctx.input.liveShareId) {
          throw new Error('liveShareId is required for delete_live_share');
        }
        await client.deleteLiveShare(ctx.input.liveShareId);
        result = { deleted: true };
        break;
    }

    return {
      output: {
        result,
        success: true
      },
      message: `Successfully performed **${ctx.input.action}** sharing action.`
    };
  })
  .build();
