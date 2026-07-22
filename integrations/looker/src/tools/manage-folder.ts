import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient, type LookerFolder, type LookerUpdateFolder } from '../lib/client';
import { spec } from '../spec';

let folderOutputSchema = z.object({
  folderId: z.string().describe('Folder ID'),
  name: z.string().optional().describe('Folder name'),
  parentId: z.string().optional().describe('Parent folder ID; omitted for a root folder'),
  childCount: z.number().optional().describe('Number of child items'),
  creatorId: z.string().optional().describe('Creator user ID'),
  contentMetadataId: z.string().optional().describe('Content metadata ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  deleted: z
    .boolean()
    .optional()
    .describe('Whether this operation permanently deleted the folder'),
  children: z
    .array(
      z.object({
        folderId: z.string().describe('Child folder ID'),
        name: z.string().optional().describe('Child name'),
        type: z.literal('folder').describe('Child resource type')
      })
    )
    .optional()
    .describe('Direct child folders (only for list_children)')
});

export let manageFolder = SlateTool.create(spec, {
  name: 'Manage Folder',
  key: 'manage_folder',
  description: `Get, create, update, permanently delete, search, or list direct child folders in Looker. Deleting a folder recursively deletes its child folders and all Looks and dashboards it contains, and cannot be undone.`,
  instructions: [
    'To get a folder: set action to "get" with folderId.',
    'To list direct child folders: set action to "list_children" with folderId.',
    'To search: set action to "search" with name or parentId.',
    'To create: set action to "create" with name and parentId.',
    'To update: set action to "update" with folderId and at least one of name or parentId.',
    'To delete permanently: set action to "delete" with folderId. This recursively deletes child folders and all contained Looks and dashboards and cannot be undone.'
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
      name: z.string().optional().describe('Folder name (for search, create, or update)'),
      parentId: z
        .string()
        .optional()
        .describe('Parent folder ID (required for create; optional for search or update)'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Deprecated page number for search/list_children; use limit and offset'),
      perPage: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Deprecated page size for search/list_children; use limit and offset'),
      limit: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Maximum results for search/list_children'),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of results to skip for search/list_children'),
      sorts: z
        .string()
        .optional()
        .describe('Fields to sort by for search/list_children (for example, "name asc")'),
      filterOr: z
        .boolean()
        .optional()
        .describe('For search, combine name and parentId filters with OR instead of AND')
    })
  )
  .output(
    z.object({
      folder: folderOutputSchema
        .optional()
        .describe('Folder details (for get, list_children, create, update, or delete)'),
      folders: z.array(folderOutputSchema).optional().describe('List of folders (for search)'),
      count: z.number().optional().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let actionMessage: string;

    let mapFolder = (folder: LookerFolder, children?: LookerFolder[]) => {
      if (folder?.id === undefined || folder.id === null) {
        throw createApiServiceError('Looker returned a folder without an ID.', {
          reason: 'looker_folder_invalid_response'
        });
      }

      return {
        folderId: String(folder.id),
        name: folder.name,
        parentId:
          folder.parent_id === undefined || folder.parent_id === null
            ? undefined
            : String(folder.parent_id),
        childCount: folder.child_count ?? undefined,
        creatorId:
          folder.creator_id === undefined || folder.creator_id === null
            ? undefined
            : String(folder.creator_id),
        contentMetadataId:
          folder.content_metadata_id === undefined || folder.content_metadata_id === null
            ? undefined
            : String(folder.content_metadata_id),
        createdAt: folder.created_at ?? undefined,
        children: children?.map(child => {
          if (child?.id === undefined || child.id === null) {
            throw createApiServiceError('Looker returned a child folder without an ID.', {
              reason: 'looker_folder_invalid_response'
            });
          }
          return {
            folderId: String(child.id),
            name: child.name,
            type: 'folder' as const
          };
        })
      };
    };

    let usesLegacyPagination = ctx.input.page !== undefined || ctx.input.perPage !== undefined;
    let usesCurrentPagination =
      ctx.input.limit !== undefined || ctx.input.offset !== undefined;
    if (
      (ctx.input.action === 'search' || ctx.input.action === 'list_children') &&
      usesLegacyPagination &&
      usesCurrentPagination
    ) {
      throw createApiServiceError(
        'Use either limit and offset or the deprecated page and perPage fields, not both.',
        { reason: 'looker_folder_pagination_conflict' }
      );
    }

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.folderId) {
          throw createApiServiceError('folderId is required for get action', {
            reason: 'looker_folder_id_required'
          });
        }
        let folder = await client.getFolder(ctx.input.folderId);
        actionMessage = `Retrieved folder **${folder.name}**`;
        return {
          output: { folder: mapFolder(folder) },
          message: actionMessage
        };
      }
      case 'list_children': {
        if (!ctx.input.folderId) {
          throw createApiServiceError('folderId is required for list_children action', {
            reason: 'looker_folder_id_required'
          });
        }
        let folder = await client.getFolder(ctx.input.folderId);
        let children = await client.getFolderChildren(ctx.input.folderId, {
          page: ctx.input.page,
          per_page: ctx.input.perPage,
          limit: ctx.input.limit,
          offset: ctx.input.offset,
          sorts: ctx.input.sorts
        });
        if (!Array.isArray(children)) {
          throw createApiServiceError('Looker returned an invalid child-folder response.', {
            reason: 'looker_folder_invalid_response'
          });
        }
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
          per_page: ctx.input.perPage,
          limit: ctx.input.limit,
          offset: ctx.input.offset,
          sorts: ctx.input.sorts,
          filter_or: ctx.input.filterOr
        });
        if (!Array.isArray(results)) {
          throw createApiServiceError('Looker returned an invalid folder search response.', {
            reason: 'looker_folder_invalid_response'
          });
        }
        let folders = results.map(folder => mapFolder(folder));
        actionMessage = `Found **${folders.length}** folder(s)${ctx.input.name ? ` matching "${ctx.input.name}"` : ''}`;
        return {
          output: { folders, count: folders.length },
          message: actionMessage
        };
      }
      case 'create': {
        if (!ctx.input.name) {
          throw createApiServiceError('name is required for create action', {
            reason: 'looker_folder_name_required'
          });
        }
        if (!ctx.input.parentId) {
          throw createApiServiceError('parentId is required for create action', {
            reason: 'looker_folder_parent_id_required'
          });
        }
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
        if (!ctx.input.folderId) {
          throw createApiServiceError('folderId is required for update action', {
            reason: 'looker_folder_id_required'
          });
        }
        let updateBody: LookerUpdateFolder = {};
        if (ctx.input.name !== undefined) updateBody.name = ctx.input.name;
        if (ctx.input.parentId !== undefined) updateBody.parent_id = ctx.input.parentId;
        if (Object.keys(updateBody).length === 0) {
          throw createApiServiceError(
            'At least one of name or parentId is required for update action',
            { reason: 'looker_folder_update_fields_required' }
          );
        }
        let folder = await client.updateFolder(ctx.input.folderId, updateBody);
        actionMessage = `Updated folder **${folder.name}**`;
        return {
          output: { folder: mapFolder(folder) },
          message: actionMessage
        };
      }
      case 'delete': {
        if (!ctx.input.folderId) {
          throw createApiServiceError('folderId is required for delete action', {
            reason: 'looker_folder_id_required'
          });
        }
        let folder = await client.getFolder(ctx.input.folderId);
        await client.deleteFolder(ctx.input.folderId);
        actionMessage = `Permanently deleted folder **${folder.name}** (ID: ${ctx.input.folderId}) and its contents`;
        return {
          output: { folder: { ...mapFolder(folder), deleted: true } },
          message: actionMessage
        };
      }
    }
  })
  .build();
