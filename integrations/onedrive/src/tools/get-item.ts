import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getItemTool = SlateTool.create(spec, {
  name: 'Get File or Folder',
  key: 'get_item',
  description: `Retrieves detailed metadata for a specific file or folder in OneDrive or SharePoint, including size, timestamps, permissions summary, and media-specific metadata (photo, audio, video). Items can be addressed by ID or path.`,
  instructions: ['Provide either itemId or itemPath to identify the item.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      driveId: z
        .string()
        .optional()
        .describe("ID of the drive. Defaults to the user's personal OneDrive."),
      itemId: z.string().optional().describe('Unique ID of the file or folder'),
      itemPath: z
        .string()
        .optional()
        .describe('Path to the file or folder (e.g. "/Documents/report.pdf")')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Unique ID of the item'),
      name: z.string().describe('File or folder name'),
      isFolder: z.boolean().describe('Whether this item is a folder'),
      size: z.number().describe('Size in bytes'),
      webUrl: z.string().describe('URL to view in a browser'),
      mimeType: z.string().optional().describe('MIME type (files only)'),
      childCount: z.number().optional().describe('Number of children (folders only)'),
      createdDateTime: z.string().describe('ISO 8601 creation timestamp'),
      lastModifiedDateTime: z.string().describe('ISO 8601 last modified timestamp'),
      createdByName: z.string().optional().describe('Display name of the creator'),
      lastModifiedByName: z.string().optional().describe('Display name of last modifier'),
      parentPath: z.string().optional().describe('Path of the parent folder'),
      driveId: z.string().optional().describe('ID of the drive containing this item'),
      downloadUrl: z.string().optional().describe('Pre-authenticated short-lived download URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let item = await client.getItem({
      driveId: ctx.input.driveId,
      itemId: ctx.input.itemId,
      itemPath: ctx.input.itemPath
    });

    return {
      output: {
        itemId: item.id,
        name: item.name,
        isFolder: !!item.folder,
        size: item.size,
        webUrl: item.webUrl,
        mimeType: item.file?.mimeType,
        childCount: item.folder?.childCount,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        createdByName: item.createdBy?.user?.displayName,
        lastModifiedByName: item.lastModifiedBy?.user?.displayName,
        parentPath: item.parentReference?.path,
        driveId: item.parentReference?.driveId,
        downloadUrl: item['@microsoft.graph.downloadUrl']
      },
      message: `Retrieved **${item.name}** (${item.folder ? 'folder' : item.file?.mimeType || 'file'}, ${formatSize(item.size)}).`
    };
  })
  .build();

let formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  let units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
};
