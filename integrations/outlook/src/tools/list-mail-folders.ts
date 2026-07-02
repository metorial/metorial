import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMailFolders = SlateTool.create(spec, {
  name: 'List Mail Folders',
  key: 'list_mail_folders',
  description: `List mail folders in the authenticated user's mailbox. Returns built-in folders (Inbox, Drafts, Sent Items, etc.) and custom folders with item counts. Optionally list child folders of a specific parent folder.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      parentFolderId: z
        .string()
        .optional()
        .describe('Parent folder ID to list child folders. Omit to list top-level folders.')
    })
  )
  .output(
    z.object({
      folders: z.array(
        z.object({
          folderId: z.string(),
          displayName: z.string(),
          parentFolderId: z.string().optional(),
          childFolderCount: z.number().optional(),
          totalItemCount: z.number().optional(),
          unreadItemCount: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMailFolders(ctx.input.parentFolderId);

    let folders = result.value.map(f => ({
      folderId: f.id,
      displayName: f.displayName,
      parentFolderId: f.parentFolderId,
      childFolderCount: f.childFolderCount,
      totalItemCount: f.totalItemCount,
      unreadItemCount: f.unreadItemCount
    }));

    return {
      output: { folders },
      message: `Found **${folders.length}** mail folder(s).`
    };
  })
  .build();
