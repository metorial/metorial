import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

let folderOutputSchema = z.object({
  folderId: z.string().describe('Folder ID'),
  name: z.string().optional().describe('Folder name'),
  parentId: z.string().optional().describe('Parent folder ID'),
  childCount: z.number().optional().describe('Number of child items'),
  creatorId: z.string().optional().describe('Creator user ID'),
  contentMetadataId: z.string().optional().describe('Content metadata ID'),
  children: z
    .array(
      z.object({
        folderId: z.string().optional().describe('Child folder ID'),
        name: z.string().optional().describe('Child name'),
        type: z.string().optional().describe('Child type (folder, look, dashboard)')
      })
    )
    .optional()
    .describe('Child items (only for get/list_children)')
});

export let manageFolder = SlateTool.create(spec, {
  name: 'Manage Folder',
  key: 'manage_folder',
  description: `Get, create, update, delete, search, or list children of a Looker folder. Folders organize Looks, dashboards, and other content into a hierarchical structure.`,
  instructions: [
    'To get a folder: set action to "get" with folderId.',
    'To list children: set action to "list_children" with folderId.',
    'To search: set action to "search" with name or parentId.',
    'To create: set action to "create" with name and parentId.',
    'To update: set action to "update" with folderId and fields to change.',
    'To delete: set action to "delete" with folderId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['get', 'list_children', 'search', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      folderId: z
        .string()
        .optional()
        .describe('Folder ID (required for get, list_children, update, delete)'),
      name: z.string().optional().describe('Folder name (for search or create)'),
      parentId: z.string().optional().describe('Parent folder ID (for search or create)'),
      page: z.number().optional().describe('Page number (for search/list)'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      folder: folderOutputSchema
        .optional()
        .describe('Folder details (for get, create, update)'),
      folders: z.array(folderOutputSchema).optional().describe('List of folders (for search)'),
      count: z.number().optional().describe('Number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let actionMessage: string;

    let mapFolder = (f: any, children?: any[]) => ({
      folderId: String(f.id),
      name: f.name,
      parentId: f.parent_id ? String(f.parent_id) : undefined,
      childCount: f.child_count,
      creatorId: f.creator_id ? String(f.creator_id) : undefined,
      contentMetadataId: f.content_metadata_id ? String(f.content_metadata_id) : undefined,
      children: children?.map((c: any) => ({
        folderId: c.id ? String(c.id) : undefined,
        name: c.name || c.title,
        type: c.is_folder ? 'folder' : c.look_id ? 'look' : 'dashboard'
      }))
    });

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.folderId) throw new Error('folderId is required');
        let folder = await client.getFolder(ctx.input.folderId);
        actionMessage = `Retrieved folder **${folder.name}**`;
        return {
          output: { folder: mapFolder(folder) },
          message: actionMessage
        };
      }
      case 'list_children': {
        if (!ctx.input.folderId) throw new Error('folderId is required');
        let folder = await client.getFolder(ctx.input.folderId);
        let children = await client.getFolderChildren(ctx.input.folderId, {
          page: ctx.input.page,
          per_page: ctx.input.perPage
        });
        actionMessage = `Listed **${children.length}** children in folder **${folder.name}**`;
        return {
          output: { folder: mapFolder(folder, children), count: children.length },
          message: actionMessage
        };
      }
      case 'search': {
        let results = await client.searchFolders({
          name: ctx.input.name,
          parent_id: ctx.input.parentId,
          page: ctx.input.page,
          per_page: ctx.input.perPage
        });
        let folders = (results || []).map((f: any) => mapFolder(f));
        actionMessage = `Found **${folders.length}** folder(s)${ctx.input.name ? ` matching "${ctx.input.name}"` : ''}`;
        return {
          output: { folders, count: folders.length },
          message: actionMessage
        };
      }
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required');
        if (!ctx.input.parentId) throw new Error('parentId is required');
        let folder = await client.createFolder({
          name: ctx.input.name,
          parent_id: ctx.input.parentId
        });
        actionMessage = `Created folder **${folder.name}** (ID: ${folder.id})`;
        return {
          output: { folder: mapFolder(folder) },
          message: actionMessage
        };
      }
      case 'update': {
        if (!ctx.input.folderId) throw new Error('folderId is required');
        let updateBody: Record<string, any> = {};
        if (ctx.input.name !== undefined) updateBody.name = ctx.input.name;
        if (ctx.input.parentId !== undefined) updateBody.parent_id = ctx.input.parentId;
        let folder = await client.updateFolder(ctx.input.folderId, updateBody);
        actionMessage = `Updated folder **${folder.name}**`;
        return {
          output: { folder: mapFolder(folder) },
          message: actionMessage
        };
      }
      case 'delete': {
        if (!ctx.input.folderId) throw new Error('folderId is required');
        let folder = await client.getFolder(ctx.input.folderId);
        await client.deleteFolder(ctx.input.folderId);
        actionMessage = `Deleted folder **${folder.name}** (ID: ${ctx.input.folderId})`;
        return {
          output: { folder: mapFolder(folder) },
          message: actionMessage
        };
      }
    }
  })
  .build();
