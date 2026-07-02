import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFolders = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `Lists the folder structure used to organize monitors. Returns subfolders and monitors within a given folder.
Omit parentId to browse root-level contents.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      parentId: z
        .string()
        .optional()
        .describe('Folder ID to browse. Omit to list root-level contents.'),
      continuationToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      subfolders: z
        .array(
          z.object({
            folderId: z.string().optional().describe('Folder ID'),
            name: z.string().optional().describe('Folder name'),
            parentId: z.string().optional().describe('Parent folder ID'),
            monitorCount: z.number().optional().describe('Number of monitors in this folder'),
            failedCount: z.number().optional().describe('Number of monitors with failures'),
            pausedCount: z.number().optional().describe('Number of paused monitors')
          })
        )
        .describe('Subfolders within the specified folder'),
      monitors: z
        .array(
          z.object({
            wachetId: z.string().optional().describe('Monitor ID'),
            name: z.string().optional().describe('Monitor name'),
            url: z.string().optional().describe('Monitored URL'),
            jobType: z.string().optional().describe('Monitor type')
          })
        )
        .describe('Monitors within the specified folder'),
      path: z
        .array(
          z.object({
            folderId: z.string().optional().describe('Folder ID'),
            name: z.string().optional().describe('Folder name')
          })
        )
        .optional()
        .describe('Breadcrumb path to the current folder'),
      continuationToken: z.string().optional().describe('Token to fetch the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listFolderContent({
      parentId: ctx.input.parentId,
      continuationToken: ctx.input.continuationToken
    });

    let subfolders = (response.subfolders ?? []).map(f => ({
      folderId: f.id,
      name: f.name,
      parentId: f.parentId,
      monitorCount: f.count,
      failedCount: f.failedCount,
      pausedCount: f.pausedCount
    }));

    let monitors = (response.tasks ?? []).map(t => ({
      wachetId: t.id,
      name: t.name,
      url: t.url,
      jobType: t.jobType
    }));

    let path = response.path?.map(p => ({
      folderId: p.id,
      name: p.name
    }));

    return {
      output: {
        subfolders,
        monitors,
        path,
        continuationToken: response.continuationToken
      },
      message: `Found **${subfolders.length}** subfolder(s) and **${monitors.length}** monitor(s)${ctx.input.parentId ? ` in folder \`${ctx.input.parentId}\`` : ' at root level'}.`
    };
  })
  .build();
