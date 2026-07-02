import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { dropboxServiceError } from '../lib/errors';
import { spec } from '../spec';

export let shareFolder = SlateTool.create(spec, {
  name: 'Share Folder',
  key: 'share_folder',
  description: `Share a folder with other users or manage shared folder membership. Use action "share" to make a folder shared, "add_member" to invite someone, "remove_member" to remove access, or "list_members" to see current members.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['share', 'add_member', 'remove_member', 'list_members'])
        .describe('Action to perform'),
      path: z.string().optional().describe('Folder path (required for "share")'),
      sharedFolderId: z
        .string()
        .optional()
        .describe('Shared folder ID (required for member management actions)'),
      members: z
        .array(
          z.object({
            email: z.string().describe('Email address of the member'),
            accessLevel: z
              .enum(['viewer', 'editor', 'owner'])
              .optional()
              .describe('Access level for the member')
          })
        )
        .optional()
        .describe('Members to add (for "add_member" action)'),
      memberEmail: z
        .string()
        .optional()
        .describe('Email of the member to remove (for "remove_member")'),
      customMessage: z
        .string()
        .optional()
        .describe('Custom message to include in the sharing invitation'),
      quiet: z.boolean().optional().describe('If true, suppress email notifications')
    })
  )
  .output(
    z.object({
      sharedFolderId: z.string().optional().describe('ID of the shared folder'),
      members: z
        .array(
          z.object({
            email: z.string().optional().describe('Member email'),
            displayName: z.string().optional().describe('Member display name'),
            accessLevel: z.string().optional().describe('Member access level'),
            accountId: z.string().optional().describe('Member account ID'),
            isInherited: z
              .boolean()
              .optional()
              .describe('Whether access is inherited from a parent folder')
          })
        )
        .optional()
        .describe('Current folder members (for "list_members")'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DropboxClient(ctx.auth.token);

    if (ctx.input.action === 'share') {
      if (!ctx.input.path) {
        throw dropboxServiceError('path is required to share a folder.');
      }
      let result = await client.shareFolder(ctx.input.path);
      return {
        output: {
          sharedFolderId: result.shared_folder_id ?? result.metadata?.shared_folder_id,
          success: true
        },
        message: `Shared folder **${ctx.input.path}**.`
      };
    }

    if (ctx.input.action === 'add_member') {
      if (!ctx.input.sharedFolderId) {
        throw dropboxServiceError('sharedFolderId is required.');
      }
      if (!ctx.input.members || ctx.input.members.length === 0)
        throw dropboxServiceError('At least one member is required.');

      await client.addFolderMember(
        ctx.input.sharedFolderId,
        ctx.input.members,
        ctx.input.quiet ?? false,
        ctx.input.customMessage
      );

      return {
        output: { success: true },
        message: `Added **${ctx.input.members.length}** member(s) to shared folder.`
      };
    }

    if (ctx.input.action === 'remove_member') {
      if (!ctx.input.sharedFolderId) {
        throw dropboxServiceError('sharedFolderId is required.');
      }
      if (!ctx.input.memberEmail) {
        throw dropboxServiceError('memberEmail is required.');
      }

      await client.removeFolderMember(ctx.input.sharedFolderId, ctx.input.memberEmail);

      return {
        output: { success: true },
        message: `Removed **${ctx.input.memberEmail}** from the shared folder.`
      };
    }

    // list_members
    if (!ctx.input.sharedFolderId) {
      throw dropboxServiceError('sharedFolderId is required.');
    }
    let result = await client.listFolderMembers(ctx.input.sharedFolderId);

    let members = (result.users || []).map((user: any) => ({
      email: user.user?.email,
      displayName: user.user?.display_name,
      accessLevel: user.access_type?.['.tag'],
      accountId: user.user?.account_id,
      isInherited: user.is_inherited
    }));

    return {
      output: { members, success: true },
      message: `Found **${members.length}** members in the shared folder.`
    };
  })
  .build();
