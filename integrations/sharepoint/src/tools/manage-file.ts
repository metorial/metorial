import { SlateTool } from 'slates';
import { z } from 'zod';
import { SharePointClient } from '../lib/client';
import { spec } from '../spec';
import { oneOfRequiredError } from './errors';

let fileOutputSchema = z.object({
  itemId: z.string().describe('Drive item ID'),
  fileName: z.string().describe('Name of the file or folder'),
  webUrl: z.string().optional().describe('URL to access the item'),
  downloadUrl: z.string().optional().describe('Direct download URL (for files)'),
  size: z.number().optional().describe('Size in bytes'),
  mimeType: z.string().optional().describe('MIME type of the file'),
  isFolder: z.boolean().describe('Whether this is a folder'),
  createdDateTime: z.string().optional().describe('When the item was created'),
  lastModifiedDateTime: z.string().optional().describe('When the item was last modified'),
  createdBy: z.string().optional().describe('User who created the item'),
  lastModifiedBy: z.string().optional().describe('User who last modified the item'),
  parentPath: z.string().optional().describe('Path of the parent folder')
});

export let manageFile = SlateTool.create(spec, {
  name: 'Manage File',
  key: 'manage_file',
  description: `Upload, download, move, copy, rename, or delete files and folders in a SharePoint document library. Also supports creating folders and listing folder contents. Use this for all file and folder operations within document libraries.`,
  instructions: [
    'Set **action** to "upload", "download", "get", "list", "createFolder", "move", "copy", "rename", or "delete".',
    'For **upload**, provide **fileContent** (text/base64), **fileName**, and either **parentPath** or **parentFolderId**.',
    'For **download**, returns the download URL of the file.',
    "For **list**, provide **driveId** and optionally **folderId** to list a specific folder's contents.",
    'For **move**, provide **destinationFolderId** in the same drive.',
    'For **copy**, provide **destinationDriveId** and **destinationFolderId**.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'upload',
          'download',
          'get',
          'list',
          'createFolder',
          'move',
          'copy',
          'rename',
          'delete'
        ])
        .describe('File action to perform'),
      driveId: z.string().describe('Drive (document library) ID'),
      itemId: z
        .string()
        .optional()
        .describe('Drive item ID (required for get, download, move, copy, rename, delete)'),
      itemPath: z
        .string()
        .optional()
        .describe(
          'Path to the item relative to the drive root (alternative to itemId for get)'
        ),
      fileName: z
        .string()
        .optional()
        .describe('File or folder name (for upload, createFolder, rename, copy)'),
      fileContent: z
        .string()
        .optional()
        .describe('File content as text (for upload, max ~4MB)'),
      parentPath: z
        .string()
        .optional()
        .describe('Parent folder path relative to drive root (for upload)'),
      parentFolderId: z
        .string()
        .optional()
        .describe('Parent folder ID (for upload, createFolder)'),
      folderId: z
        .string()
        .optional()
        .describe('Folder ID to list contents of (for list action)'),
      destinationFolderId: z
        .string()
        .optional()
        .describe('Destination folder ID (for move, copy)'),
      destinationDriveId: z
        .string()
        .optional()
        .describe('Destination drive ID (for copy across drives)'),
      newName: z.string().optional().describe('New name (for rename)')
    })
  )
  .output(
    z.object({
      file: fileOutputSchema.optional().describe('File/folder details'),
      files: z
        .array(fileOutputSchema)
        .optional()
        .describe('List of files and folders (for list action)'),
      downloadUrl: z.string().optional().describe('Direct download URL (for download action)'),
      deleted: z.boolean().optional().describe('Whether the item was deleted'),
      copied: z.boolean().optional().describe('Whether the copy was initiated'),
      copyMonitorUrl: z
        .string()
        .optional()
        .describe('Monitor URL returned by Microsoft Graph for async copy operations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SharePointClient(ctx.auth.token);
    let {
      action,
      driveId,
      itemId,
      itemPath,
      fileName,
      fileContent,
      parentPath,
      parentFolderId,
      folderId,
      destinationFolderId,
      destinationDriveId,
      newName
    } = ctx.input;

    let mapItem = (item: any) => ({
      itemId: item.id,
      fileName: item.name,
      webUrl: item.webUrl,
      downloadUrl: item['@microsoft.graph.downloadUrl'],
      size: item.size,
      mimeType: item.file?.mimeType,
      isFolder: !!item.folder,
      createdDateTime: item.createdDateTime,
      lastModifiedDateTime: item.lastModifiedDateTime,
      createdBy: item.createdBy?.user?.displayName,
      lastModifiedBy: item.lastModifiedBy?.user?.displayName,
      parentPath: item.parentReference?.path
    });

    switch (action) {
      case 'get': {
        let item: any;
        if (itemPath) {
          item = await client.getDriveItemByPath(driveId, itemPath);
        } else if (itemId) {
          item = await client.getDriveItem(driveId, itemId);
        } else {
          throw oneOfRequiredError(
            'For get action, one of itemId or itemPath must be provided.',
            ['itemId', 'itemPath']
          );
        }
        return {
          output: { file: mapItem(item) },
          message: `Retrieved **${item.name}** (${item.folder ? 'folder' : `${item.size} bytes`}).`
        };
      }

      case 'list': {
        let data = await client.listDriveItems(driveId, folderId);
        let files = (data.value || []).map(mapItem);
        return {
          output: { files },
          message: `Found **${files.length}** item(s) in the folder.`
        };
      }

      case 'upload': {
        if (!fileName) throw new Error('fileName is required for upload.');
        if (fileContent === undefined) throw new Error('fileContent is required for upload.');
        let item: any;
        if (parentFolderId) {
          item = await client.uploadSmallFileToFolder(
            driveId,
            parentFolderId,
            fileName,
            fileContent
          );
        } else {
          let path = parentPath || '';
          item = await client.uploadSmallFile(driveId, path, fileName, fileContent);
        }
        return {
          output: { file: mapItem(item) },
          message: `Uploaded **${fileName}** (${item.size} bytes).`
        };
      }

      case 'download': {
        if (!itemId) throw new Error('itemId is required for download.');
        let downloadUrl = await client.getFileDownloadUrl(driveId, itemId);
        return {
          output: { downloadUrl },
          message: `Download URL generated for item \`${itemId}\`.`
        };
      }

      case 'createFolder': {
        if (!fileName) throw new Error('fileName is required for createFolder.');
        let parent = parentFolderId || 'root';
        let item = await client.createFolder(driveId, parent, fileName);
        return {
          output: { file: mapItem(item) },
          message: `Created folder **${fileName}**.`
        };
      }

      case 'move': {
        if (!itemId) throw new Error('itemId is required for move.');
        if (!destinationFolderId) throw new Error('destinationFolderId is required for move.');
        let item = await client.moveDriveItem(driveId, itemId, destinationFolderId, newName);
        return {
          output: { file: mapItem(item) },
          message: `Moved item to folder \`${destinationFolderId}\`.`
        };
      }

      case 'copy': {
        if (!itemId) throw new Error('itemId is required for copy.');
        if (!destinationFolderId) throw new Error('destinationFolderId is required for copy.');
        let targetDrive = destinationDriveId || driveId;
        let copy = await client.copyDriveItem(
          driveId,
          itemId,
          targetDrive,
          destinationFolderId,
          fileName
        );
        return {
          output: {
            copied: true,
            copyMonitorUrl: copy.copyMonitorUrl
          },
          message: `Copy initiated for item \`${itemId}\`.`
        };
      }

      case 'rename': {
        if (!itemId) throw new Error('itemId is required for rename.');
        if (!newName) throw new Error('newName is required for rename.');
        let item = await client.renameDriveItem(driveId, itemId, newName);
        return {
          output: { file: mapItem(item) },
          message: `Renamed item to **${newName}**.`
        };
      }

      case 'delete': {
        if (!itemId) throw new Error('itemId is required for delete.');
        await client.deleteDriveItem(driveId, itemId);
        return {
          output: { deleted: true },
          message: `Deleted item \`${itemId}\`.`
        };
      }
    }
  })
  .build();
