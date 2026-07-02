import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSharedLink = SlateTool.create(spec, {
  name: 'Manage Shared Link',
  key: 'manage_shared_link',
  description: `Create, update, or remove shared links on Box files and folders. Configure access levels (open, company, collaborators), optional passwords, and expiration dates.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'remove'])
        .describe('Whether to create/update or remove the shared link'),
      itemType: z
        .enum(['file', 'folder'])
        .describe('Type of item to create a shared link for'),
      itemId: z.string().describe('ID of the file or folder'),
      access: z
        .enum(['open', 'company', 'collaborators'])
        .optional()
        .describe('Access level for the shared link (for create)'),
      password: z
        .string()
        .optional()
        .describe('Optional password to protect the shared link (for create)'),
      expiresAt: z
        .string()
        .optional()
        .describe('ISO 8601 expiration date for the shared link (for create)'),
      canDownload: z
        .boolean()
        .optional()
        .describe('Whether downloading is allowed via the shared link'),
      canPreview: z
        .boolean()
        .optional()
        .describe('Whether previewing is allowed via the shared link'),
      canEdit: z
        .boolean()
        .optional()
        .describe('Whether editing is allowed via the shared link (files only)')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the file or folder'),
      sharedLinkUrl: z.string().optional().describe('The shared link URL'),
      access: z.string().optional().describe('Access level of the shared link'),
      removed: z.boolean().optional().describe('True if the shared link was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      action,
      itemType,
      itemId,
      access,
      password,
      expiresAt,
      canDownload,
      canPreview,
      canEdit
    } = ctx.input;

    if (action === 'remove') {
      if (itemType === 'file') {
        await client.removeFileSharedLink(itemId);
      } else {
        await client.removeFolderSharedLink(itemId);
      }
      return {
        output: { itemId, removed: true },
        message: `Removed shared link from ${itemType} ${itemId}.`
      };
    }

    let permissions: any = {};
    if (canDownload !== undefined) permissions.canDownload = canDownload;
    if (canPreview !== undefined) permissions.canPreview = canPreview;
    if (canEdit !== undefined && itemType === 'file') permissions.canEdit = canEdit;
    let hasPermissions = Object.keys(permissions).length > 0;

    let result: any;
    if (itemType === 'file') {
      result = await client.createFileSharedLink(itemId, {
        access,
        password,
        unsharedAt: expiresAt,
        permissions: hasPermissions ? permissions : undefined
      });
    } else {
      result = await client.createFolderSharedLink(itemId, {
        access,
        password,
        unsharedAt: expiresAt,
        permissions: hasPermissions ? permissions : undefined
      });
    }

    let sharedLink = result.shared_link;
    return {
      output: {
        itemId,
        sharedLinkUrl: sharedLink?.url,
        access: sharedLink?.access
      },
      message: `Created shared link for ${itemType} ${itemId}: ${sharedLink?.url || 'N/A'}`
    };
  });
