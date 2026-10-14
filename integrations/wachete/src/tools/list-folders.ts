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
      folderId: f.id ?? undefined,
      name: f.name ?? undefined,
      parentId: f.parentId ?? undefined,
      monitorCount: f.count ?? undefined,
      failedCount: f.failedCount ?? undefined,
      pausedCount: f.pausedCount ?? undefined
    }));

    let monitors = (response.tasks ?? []).map(t => ({
      wachetId: t.id ?? undefined,
      name: t.name ?? undefined,
      url: t.url ?? undefined,
      jobType: t.jobType == null ? undefined : String(t.jobType)
    }));

    let path = response.path?.map(p => ({
      folderId: p.id ?? undefined,
      name: p.name ?? undefined
    }));

    return {
      output: {
        subfolders,
        monitors,
        path,
        continuationToken: response.continuationToken ?? undefined
      },
      message: `Found **${subfolders.length}** subfolder(s) and **${monitors.length}** monitor(s)${ctx.input.parentId ? ` in folder \`${ctx.input.parentId}\`` : ' at root level'}.`
    };
  })
  .build();
