import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { mondayServiceError } from '../lib/errors';
import { spec } from '../spec';

let folderSchema = z.object({
  folderId: z.string().describe('Folder ID'),
  name: z.string().describe('Folder name'),
  color: z.string().nullable().describe('Folder color'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  ownerId: z.string().nullable().describe('Owner user ID'),
  workspaceId: z.string().nullable().describe('Workspace ID'),
  workspaceName: z.string().nullable().describe('Workspace name'),
  parentFolderId: z.string().nullable().describe('Parent folder ID'),
  subFolderIds: z.array(z.string()).describe('Nested subfolder IDs'),
  boardIds: z.array(z.string()).describe('Board IDs in the folder')
});

let mapFolder = (folder: any) => ({
  folderId: String(folder.id),
  name: folder.name,
  color: folder.color || null,
  createdAt: folder.created_at || null,
  ownerId: folder.owner_id ? String(folder.owner_id) : null,
  workspaceId: folder.workspace?.id ? String(folder.workspace.id) : null,
  workspaceName: folder.workspace?.name || null,
  parentFolderId: folder.parent?.id ? String(folder.parent.id) : null,
  subFolderIds: (folder.sub_folders || []).map((subfolder: any) => String(subfolder.id)),
  boardIds: (folder.children || []).map((board: any) => String(board.id))
});

export let listFoldersTool = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `List monday.com workspace folders. Use includeMainWorkspace to request folders in the Main Workspace.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      folderIds: z.array(z.string()).optional().describe('Specific folder IDs to retrieve'),
      workspaceIds: z
        .array(z.string())
        .optional()
        .describe('Workspace IDs whose folders should be returned'),
      includeMainWorkspace: z
        .boolean()
        .optional()
        .describe('Include folders in the Main Workspace by passing null workspace ID'),
      limit: z.number().int().min(1).max(100).optional().describe('Max folders to return'),
      page: z.number().int().min(1).optional().describe('Page number starting at 1')
    })
  )
  .output(
    z.object({
      folders: z.array(folderSchema).describe('Folders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let workspaceIds: (string | null)[] = ctx.input.workspaceIds
      ? [...ctx.input.workspaceIds]
      : [];
    if (ctx.input.includeMainWorkspace) workspaceIds.push(null);

    let folders = await client.getFolders({
      ids: ctx.input.folderIds,
      workspaceIds: workspaceIds as (string | null)[],
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let mapped = folders.map(mapFolder);

    return {
      output: { folders: mapped },
      message: `Found **${mapped.length}** folder(s).`
    };
  })
  .build();

export let createFolderTool = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a folder in a workspace or the Main Workspace.`
})
  .input(
    z.object({
      name: z.string().describe('Folder name'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Omit to create in the Main Workspace.'),
      parentFolderId: z.string().optional().describe('Parent folder ID for nesting'),
      color: z.string().optional().describe('monday.com FolderColor enum value')
    })
  )
  .output(folderSchema)
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let folder = await client.createFolder({
      name: ctx.input.name,
      workspaceId: ctx.input.workspaceId,
      parentFolderId: ctx.input.parentFolderId,
      color: ctx.input.color
    });

    return {
      output: mapFolder(folder),
      message: `Created folder **${folder.name}** (ID: ${folder.id}).`
    };
  })
  .build();

export let updateFolderTool = SlateTool.create(spec, {
  name: 'Update Folder',
  key: 'update_folder',
  description: `Update folder metadata, workspace, parent, or menu position.`
})
  .input(
    z.object({
      folderId: z.string().describe('Folder ID to update'),
      name: z.string().optional().describe('New folder name'),
      workspaceId: z.string().optional().describe('Workspace ID to move the folder to'),
      parentFolderId: z.string().optional().describe('Parent folder ID for nesting'),
      color: z.string().optional().describe('monday.com FolderColor enum value'),
      customIcon: z.string().optional().describe('monday.com FolderCustomIcon enum value'),
      fontWeight: z
        .enum([
          'FONT_WEIGHT_BOLD',
          'FONT_WEIGHT_LIGHT',
          'FONT_WEIGHT_NORMAL',
          'FONT_WEIGHT_VERY_LIGHT',
          'NULL'
        ])
        .optional()
        .describe('Folder font weight'),
      accountProductId: z.string().optional().describe('Product ID to move the folder to'),
      positionObjectId: z
        .string()
        .optional()
        .describe('Object ID to position this folder before or after'),
      positionObjectType: z
        .enum(['Board', 'Folder', 'Overview'])
        .optional()
        .describe('Type of object referenced by positionObjectId'),
      positionIsAfter: z
        .boolean()
        .optional()
        .describe('Whether to place the folder after the referenced object')
    })
  )
  .output(folderSchema)
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let hasPosition =
      ctx.input.positionObjectId !== undefined || ctx.input.positionObjectType !== undefined;

    if (hasPosition && (!ctx.input.positionObjectId || !ctx.input.positionObjectType)) {
      throw mondayServiceError(
        'positionObjectId and positionObjectType must be provided together.'
      );
    }

    let folder = await client.updateFolder({
      folderId: ctx.input.folderId,
      name: ctx.input.name,
      workspaceId: ctx.input.workspaceId,
      parentFolderId: ctx.input.parentFolderId,
      color: ctx.input.color,
      customIcon: ctx.input.customIcon,
      fontWeight: ctx.input.fontWeight,
      accountProductId: ctx.input.accountProductId,
      position: hasPosition
        ? {
            object_id: ctx.input.positionObjectId as string,
            object_type: ctx.input.positionObjectType as string,
            is_after: ctx.input.positionIsAfter
          }
        : undefined
    });

    return {
      output: mapFolder(folder),
      message: `Updated folder ${ctx.input.folderId}.`
    };
  })
  .build();

export let deleteFolderTool = SlateTool.create(spec, {
  name: 'Delete Folder',
  key: 'delete_folder',
  description: `Delete a folder and its contents.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      folderId: z.string().describe('Folder ID to delete')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('Deleted folder ID'),
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let folder = await client.deleteFolder(ctx.input.folderId);

    return {
      output: {
        folderId: String(folder.id ?? ctx.input.folderId),
        success: true
      },
      message: `Deleted folder ${ctx.input.folderId}.`
    };
  })
  .build();
