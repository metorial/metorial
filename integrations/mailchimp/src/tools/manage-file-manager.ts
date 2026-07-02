import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { mailchimpServiceError } from '../lib/errors';
import { spec } from '../spec';

let fileSchema = z.object({
  fileId: z.number(),
  name: z.string(),
  type: z.string().optional(),
  size: z.number().optional(),
  createdAt: z.string().optional(),
  fullSizeUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  folderId: z.number().optional()
});

let folderSchema = z.object({
  folderId: z.number(),
  name: z.string(),
  fileCount: z.number().optional(),
  createdAt: z.string().optional()
});

let mapFile = (file: any) => ({
  fileId: file.id,
  name: file.name,
  type: file.type,
  size: file.size,
  createdAt: file.created_at,
  fullSizeUrl: file.full_size_url,
  thumbnailUrl: file.thumbnail_url,
  folderId: file.folder_id
});

let mapFolder = (folder: any) => ({
  folderId: folder.id,
  name: folder.name,
  fileCount: folder.file_count,
  createdAt: folder.created_at
});

export let manageFileManagerTool = SlateTool.create(spec, {
  name: 'Manage File Manager',
  key: 'manage_file_manager',
  description:
    'List, get, upload, update, or delete File Manager files and folders. Use uploaded file URLs in campaigns, templates, signup forms, and landing pages.',
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      resource: z.enum(['file', 'folder']).describe('Manage a File Manager file or folder'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .optional()
        .describe('Action to perform. Defaults to "list".'),
      fileId: z.number().optional().describe('File ID for file get/update/delete'),
      folderId: z
        .number()
        .optional()
        .describe('Folder ID for folder get/update/delete, or to scope/list/upload files'),
      name: z.string().optional().describe('File or folder name'),
      fileData: z
        .string()
        .optional()
        .describe('Base64-encoded file contents. Required when creating a file.'),
      count: z.number().optional().describe('Number of records to return when listing'),
      offset: z.number().optional().describe('Number of records to skip when listing')
    })
  )
  .output(
    z.object({
      files: z.array(fileSchema).optional(),
      file: fileSchema.optional(),
      folders: z.array(folderSchema).optional(),
      folder: folderSchema.optional(),
      deleted: z.boolean().optional(),
      totalItems: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let action = ctx.input.action ?? 'list';

    if (ctx.input.resource === 'file') {
      if (action === 'list') {
        let result =
          ctx.input.folderId !== undefined
            ? await client.getFilesInFolder(ctx.input.folderId, {
                count: ctx.input.count,
                offset: ctx.input.offset
              })
            : await client.getFileManagerFiles({
                count: ctx.input.count,
                offset: ctx.input.offset
              });

        let files = (result.files ?? []).map(mapFile);

        return {
          output: {
            files,
            totalItems: result.total_items ?? 0
          },
          message: `Found **${files.length}** file(s) in File Manager.`
        };
      }

      if (action === 'get') {
        if (ctx.input.fileId === undefined) {
          throw mailchimpServiceError('fileId is required to get a File Manager file.');
        }

        let result = await client.getFileManagerFile(ctx.input.fileId);
        let file = mapFile(result);

        return {
          output: { file },
          message: `Retrieved File Manager file **${file.name}**.`
        };
      }

      if (action === 'delete') {
        if (ctx.input.fileId === undefined) {
          throw mailchimpServiceError('fileId is required to delete a File Manager file.');
        }

        await client.deleteFileManagerFile(ctx.input.fileId);

        return {
          output: { deleted: true },
          message: `File Manager file **${ctx.input.fileId}** has been deleted.`
        };
      }

      if (action === 'create') {
        if (!ctx.input.name || !ctx.input.fileData) {
          throw mailchimpServiceError(
            'name and fileData are required to create a File Manager file.'
          );
        }

        let result = await client.createFileManagerFile({
          name: ctx.input.name,
          fileData: ctx.input.fileData,
          folderId: ctx.input.folderId
        });
        let file = mapFile(result);

        return {
          output: { file },
          message: `File Manager file **${file.name}** has been uploaded.`
        };
      }

      if (ctx.input.fileId === undefined) {
        throw mailchimpServiceError('fileId is required to update a File Manager file.');
      }
      if (!ctx.input.name && ctx.input.folderId === undefined) {
        throw mailchimpServiceError(
          'name or folderId is required to update a File Manager file.'
        );
      }

      let result = await client.updateFileManagerFile(ctx.input.fileId, {
        name: ctx.input.name,
        folderId: ctx.input.folderId
      });
      let file = mapFile(result);

      return {
        output: { file },
        message: `File Manager file **${file.name}** has been updated.`
      };
    }

    if (action === 'list') {
      let result = await client.getFileManagerFolders({
        count: ctx.input.count,
        offset: ctx.input.offset
      });
      let folders = (result.folders ?? []).map(mapFolder);

      return {
        output: {
          folders,
          totalItems: result.total_items ?? 0
        },
        message: `Found **${folders.length}** File Manager folder(s).`
      };
    }

    if (action === 'get') {
      if (ctx.input.folderId === undefined) {
        throw mailchimpServiceError('folderId is required to get a File Manager folder.');
      }

      let result = await client.getFileManagerFolder(ctx.input.folderId);
      let folder = mapFolder(result);

      return {
        output: { folder },
        message: `Retrieved File Manager folder **${folder.name}**.`
      };
    }

    if (action === 'delete') {
      if (ctx.input.folderId === undefined) {
        throw mailchimpServiceError('folderId is required to delete a File Manager folder.');
      }

      await client.deleteFileManagerFolder(ctx.input.folderId);

      return {
        output: { deleted: true },
        message: `File Manager folder **${ctx.input.folderId}** has been deleted.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) {
        throw mailchimpServiceError('name is required to create a File Manager folder.');
      }

      let result = await client.createFileManagerFolder({ name: ctx.input.name });
      let folder = mapFolder(result);

      return {
        output: { folder },
        message: `File Manager folder **${folder.name}** has been created.`
      };
    }

    if (ctx.input.folderId === undefined) {
      throw mailchimpServiceError('folderId is required to update a File Manager folder.');
    }
    if (!ctx.input.name) {
      throw mailchimpServiceError('name is required to update a File Manager folder.');
    }

    let result = await client.updateFileManagerFolder(ctx.input.folderId, {
      name: ctx.input.name
    });
    let folder = mapFolder(result);

    return {
      output: { folder },
      message: `File Manager folder **${folder.name}** has been updated.`
    };
  })
  .build();
