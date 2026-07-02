import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFolders = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `List all folders in the Retool organization. Folders are used to organize apps and resources.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of folders to return (1-100)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      folders: z.array(
        z.object({
          folderId: z.string(),
          folderName: z.string(),
          parentFolderId: z.string().nullable().optional(),
          folderType: z.string().optional(),
          isSystemFolder: z.boolean().optional()
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listFolders({
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    let folders = result.data.map(f => ({
      folderId: f.id,
      folderName: f.name,
      parentFolderId: f.parent_folder_id,
      folderType: f.folder_type,
      isSystemFolder: f.is_system_folder
    }));

    return {
      output: {
        folders,
        totalCount: result.total_count,
        hasMore: result.has_more,
        nextToken: result.next_token
      },
      message: `Found **${result.total_count}** folders. Returned **${folders.length}** folders${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
