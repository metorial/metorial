import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFoldersTool = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `List all form folders in the account. Returns folder hierarchy with names, owners, and contained form IDs. Useful for understanding how forms are organized.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      folders: z.array(
        z.object({
          folderId: z.string().describe('Folder identifier'),
          name: z.string().describe('Folder name'),
          owner: z.string().optional().describe('Folder owner username (for shared folders)'),
          color: z.string().optional().describe('Folder color'),
          parentId: z.string().optional().describe('Parent folder ID'),
          formIds: z.array(z.string()).optional().describe('IDs of forms in this folder'),
          subfolderCount: z.number().optional().describe('Number of subfolders')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    let foldersData = await client.listFolders();

    let folders: Array<{
      folderId: string;
      name: string;
      owner?: string;
      color?: string;
      parentId?: string;
      formIds?: string[];
      subfolderCount?: number;
    }> = [];

    let extractFolders = (data: any, parentId?: string) => {
      if (!data) return;

      if (data.id && data.name) {
        let formIds: string[] = [];
        if (data.forms) {
          for (let form of Object.values(data.forms) as any[]) {
            if (form?.id) formIds.push(String(form.id));
          }
        }

        let subfoldersCount = 0;
        if (data.subfolders) {
          subfoldersCount = Array.isArray(data.subfolders)
            ? data.subfolders.length
            : Object.keys(data.subfolders).length;
        }

        folders.push({
          folderId: String(data.id),
          name: data.name,
          owner: data.owner || undefined,
          color: data.color || undefined,
          parentId: parentId,
          formIds: formIds.length > 0 ? formIds : undefined,
          subfolderCount: subfoldersCount || undefined
        });

        if (data.subfolders) {
          let subs = Array.isArray(data.subfolders)
            ? data.subfolders
            : Object.values(data.subfolders);
          for (let sub of subs) {
            extractFolders(sub, String(data.id));
          }
        }
      }

      if (data.folders) {
        let folderList = Array.isArray(data.folders)
          ? data.folders
          : Object.values(data.folders);
        for (let folder of folderList) {
          extractFolders(folder);
        }
      }
    };

    extractFolders(foldersData);

    return {
      output: { folders },
      message: `Found **${folders.length}** folder(s).`
    };
  })
  .build();
