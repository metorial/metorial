import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

let shareSchema = z.object({
  shareId: z.string().optional().describe('Share ID'),
  email: z.string().optional().describe('Email of the shared user'),
  accessLevel: z
    .string()
    .optional()
    .describe('Access level (VIEWER, COMMENTER, EDITOR, EDITOR_SHARE, ADMIN, OWNER)'),
  name: z.string().optional().describe('Name of the shared user'),
  type: z.string().optional().describe('Share type (USER, GROUP)'),
  userId: z.number().optional().describe('ID of the shared user'),
  groupId: z.number().optional().describe('ID of the shared group'),
  scope: z
    .string()
    .optional()
    .describe('Whether access is direct or inherited from a workspace')
});

export let shareResource = SlateTool.create(spec, {
  name: 'Share Resource',
  key: 'share_resource',
  description: `Share a sheet or workspace with users or groups. List a page of current shares, add new shares, update access levels, or remove shares.`,
  instructions: [
    'For list, pass the returned lastKey to retrieve the next page until lastKey is absent.',
    'For add, provide exactly one of email or groupId and an accessLevel for each share.',
    'Updating a share does not support ownership transfer; OWNER cannot be used with update.'
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
              .describe('Email address to share with for add; omit when using groupId'),
            groupId: z
              .string()
              .optional()
              .describe('Group ID to share with for add; omit when using email'),
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
      message: z.string().optional().describe('Email message when sharing'),
      maxItems: z
        .number()
        .int()
        .min(100)
        .optional()
        .describe('Maximum shares per page for list; minimum 100'),
      lastKey: z
        .string()
        .optional()
        .describe('Pagination token from the previous list result'),
      sharingInclude: z
        .enum(['ITEM', 'WORKSPACE'])
        .optional()
        .describe('Share scope to include when listing; WORKSPACE includes inherited access')
    })
  )
  .output(
    z.object({
      shares: z.array(shareSchema).optional().describe('Share results'),
      success: z.boolean().optional().describe('Whether the operation was successful'),
      lastKey: z.string().optional().describe('Token for the next page of shares')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listResourceShares(
        ctx.input.resourceType,
        ctx.input.resourceId,
        {
          maxItems: ctx.input.maxItems,
          lastKey: ctx.input.lastKey,
          sharingInclude: ctx.input.sharingInclude
        }
      );
      let shares = (result.items || []).map((s: any) => ({
        shareId: s.id,
        email: s.email,
        accessLevel: s.accessLevel,
        name: s.name,
        type: s.type,
        userId: s.userId,
        groupId: s.groupId,
        scope: s.scope
      }));
      return {
        output: { shares, lastKey: result.lastKey },
        message: `Found **${shares.length}** share(s).`
      };
    }

    let shares = ctx.input.shares;
    if (!shares?.length) {
      throw createApiServiceError(`Provide at least one share for ${ctx.input.action}.`);
    }

    let accessLevels = ['VIEWER', 'COMMENTER', 'EDITOR', 'EDITOR_SHARE', 'ADMIN', 'OWNER'];
    for (let share of shares) {
      if (ctx.input.action === 'add') {
        if (Boolean(share.email?.trim()) === Boolean(share.groupId?.trim())) {
          throw createApiServiceError(
            'For add, provide exactly one of email or groupId for each share.'
          );
        }
        if (
          share.groupId &&
          (!/^\d+$/.test(share.groupId) ||
            !Number.isSafeInteger(Number(share.groupId)) ||
            Number(share.groupId) <= 0)
        ) {
          throw createApiServiceError('groupId must be a positive numeric group ID.');
        }
      } else if (!share.shareId?.trim()) {
        throw createApiServiceError(
          `Provide a shareId for each share to ${ctx.input.action}. Call share_resource with action list to find share IDs.`
        );
      }
      if (
        ctx.input.action !== 'remove' &&
        (!share.accessLevel || !accessLevels.includes(share.accessLevel))
      ) {
        throw createApiServiceError(
          `Provide a valid accessLevel: ${accessLevels.join(', ')}.`
        );
      }
      if (ctx.input.action === 'update' && share.accessLevel === 'OWNER') {
        throw createApiServiceError(
          'Updating a share does not support ownership transfer. Choose another accessLevel.'
        );
      }
    }

    if (ctx.input.action === 'add') {
      let shareEntries = shares.map(s => ({
        email: s.email?.trim() || undefined,
        groupId: s.groupId ? Number(s.groupId) : undefined,
        accessLevel: s.accessLevel!,
        subject: ctx.input.subject,
        message: ctx.input.message
      }));

      let result = await client.shareResource(
        ctx.input.resourceType,
        ctx.input.resourceId,
        shareEntries,
        {
          sendEmail: ctx.input.sendEmail
        }
      );

      return {
        output: {
          success: true,
          shares: (result.result || []).map((s: any) => ({
            shareId: s.id,
            email: s.email,
            accessLevel: s.accessLevel,
            name: s.name,
            type: s.type,
            userId: s.userId,
            groupId: s.groupId,
            scope: s.scope
          }))
        },
        message: `Processed sharing for **${shareEntries.length}** user(s) or group(s).`
      };
    }

    if (ctx.input.action === 'update') {
      for (let share of shares) {
        await client.updateResourceShare(
          ctx.input.resourceType,
          ctx.input.resourceId,
          share.shareId!,
          { accessLevel: share.accessLevel! }
        );
      }
      return {
        output: { success: true },
        message: `Updated **${shares.length}** share(s).`
      };
    }

    // remove
    for (let share of shares) {
      await client.deleteResourceShare(
        ctx.input.resourceType,
        ctx.input.resourceId,
        share.shareId!
      );
    }
    return {
      output: { success: true },
      message: `Removed **${shares.length}** share(s).`
    };
  })
  .build();
