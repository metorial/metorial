import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

let shareSchema = z.object({
  shareId: z.string().optional().describe('Share ID'),
  email: z.string().optional().describe('Email of the shared user'),
  accessLevel: z
    .string()
    .optional()
    .describe('Access level (VIEWER, EDITOR, EDITOR_SHARE, ADMIN, OWNER)'),
  name: z.string().optional().describe('Name of the shared user'),
  type: z.string().optional().describe('Share type (USER, GROUP)')
});

export let shareResource = SlateTool.create(spec, {
  name: 'Share Resource',
  key: 'share_resource',
  description: `Share a sheet or workspace with users. Can list current shares, add new shares, update access levels, or remove shares. Access levels include VIEWER, EDITOR, EDITOR_SHARE, ADMIN, and OWNER.`,
  instructions: [
    'Access levels: VIEWER (read only), EDITOR (read/write), EDITOR_SHARE (read/write/share), ADMIN (full control), OWNER (transfer ownership).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'add', 'update', 'remove'])
        .describe('Sharing action to perform'),
      resourceType: z.enum(['sheet', 'workspace']).describe('Type of resource to share'),
      resourceId: z.string().describe('ID of the sheet or workspace'),
      shares: z
        .array(
          z.object({
            shareId: z
              .string()
              .optional()
              .describe('Share ID (required for update and remove)'),
            email: z
              .string()
              .optional()
              .describe('Email address to share with (required for add)'),
            accessLevel: z
              .string()
              .optional()
              .describe('Access level to grant (required for add and update)')
          })
        )
        .optional()
        .describe('Share definitions (required for add, update, remove)'),
      sendEmail: z.boolean().optional().describe('Send notification email when sharing'),
      subject: z.string().optional().describe('Email subject line when sharing'),
      message: z.string().optional().describe('Email message when sharing')
    })
  )
  .output(
    z.object({
      shares: z.array(shareSchema).optional().describe('Share results'),
      success: z.boolean().optional().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listSheetShares(ctx.input.resourceId, { includeAll: true });
      let shares = (result.data || []).map((s: any) => ({
        shareId: s.id,
        email: s.email,
        accessLevel: s.accessLevel,
        name: s.name,
        type: s.type
      }));
      return {
        output: { shares },
        message: `Found **${shares.length}** share(s).`
      };
    }

    if (ctx.input.action === 'add') {
      let shareEntries = (ctx.input.shares || []).map(s => ({
        email: s.email!,
        accessLevel: s.accessLevel!,
        subject: ctx.input.subject,
        message: ctx.input.message
      }));

      if (ctx.input.resourceType === 'workspace') {
        await client.shareWorkspace(ctx.input.resourceId, shareEntries, {
          sendEmail: ctx.input.sendEmail
        });
      } else {
        await client.shareSheet(ctx.input.resourceId, shareEntries, {
          sendEmail: ctx.input.sendEmail
        });
      }

      return {
        output: { success: true },
        message: `Shared ${ctx.input.resourceType} with **${shareEntries.length}** user(s).`
      };
    }

    if (ctx.input.action === 'update') {
      for (let share of ctx.input.shares || []) {
        if (!share.shareId || !share.accessLevel) continue;
        await client.updateSheetShare(ctx.input.resourceId, share.shareId, {
          accessLevel: share.accessLevel
        });
      }
      return {
        output: { success: true },
        message: `Updated **${(ctx.input.shares || []).length}** share(s).`
      };
    }

    // remove
    for (let share of ctx.input.shares || []) {
      if (!share.shareId) continue;
      await client.deleteSheetShare(ctx.input.resourceId, share.shareId);
    }
    return {
      output: { success: true },
      message: `Removed **${(ctx.input.shares || []).length}** share(s).`
    };
  })
  .build();
