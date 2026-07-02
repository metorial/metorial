import { SlateTool } from 'slates';
import { z } from 'zod';
import { LastPassClient } from '../lib/client';
import { spec } from '../spec';

let sharedFolderUserSchema = z.object({
  username: z.string().describe('Email address of the user with access'),
  readOnly: z.boolean().describe('Whether the user has read-only access'),
  canGive: z.boolean().describe('Whether the user can share access with others'),
  canAdminister: z.boolean().describe('Whether the user has admin privileges on the folder'),
  groupName: z.string().optional().describe('Group name if access is via group membership')
});

let sharedFolderSchema = z.object({
  folderId: z.string().describe('Unique identifier of the shared folder'),
  folderName: z.string().describe('Name of the shared folder'),
  securityScore: z.number().describe('Security score of the shared folder'),
  users: z
    .array(sharedFolderUserSchema)
    .describe('Users with access to this folder and their permissions')
});

export let getSharedFolders = SlateTool.create(spec, {
  name: 'Get Shared Folders',
  key: 'get_shared_folders',
  description: `Retrieve all shared folders in the LastPass Enterprise account with their contained sites, user permissions (read-only, admin, give access), and security scores.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      folders: z.array(sharedFolderSchema).describe('List of shared folders with permissions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LastPassClient({
      companyId: ctx.auth.companyId,
      provisioningHash: ctx.auth.provisioningHash
    });

    let folderData = await client.getSharedFolderData();

    let folders = Object.entries(folderData).map(([folderId, folder]) => ({
      folderId,
      folderName: folder.sharedfoldername || '',
      securityScore: folder.score || 0,
      users: (folder.users || []).map(u => ({
        username: u.username || '',
        readOnly: u.readonly === '1' || u.readonly === 'true',
        canGive: u.give === '1' || u.give === 'true',
        canAdminister: u.can_administer === '1' || u.can_administer === 'true',
        groupName: u.group_name || undefined
      }))
    }));

    return {
      output: { folders },
      message: `Retrieved **${folders.length}** shared folder(s).`
    };
  })
  .build();
