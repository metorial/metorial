import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List files and folders within a specific folder in OneDrive or SharePoint.
If no folder ID is provided, lists items at the drive root. Returns all child items with their metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z
        .string()
        .optional()
        .describe(
          'The ID of the folder to list contents of. If omitted, lists the drive root.'
        )
    })
  )
  .output(
    z.object({
      items: z
        .array(
          z.object({
            itemId: z.string().describe('The unique ID of the drive item'),
            name: z.string().describe('File or folder name'),
            mimeType: z.string().optional().describe('MIME type (files only)'),
            size: z.number().optional().describe('Size in bytes'),
            webUrl: z.string().optional().describe('URL to open in browser'),
            modifiedAt: z.string().optional().describe('ISO 8601 last modified timestamp'),
            modifiedBy: z.string().optional().describe('Display name of the last modifier'),
            isFolder: z.boolean().describe('Whether this item is a folder')
          })
        )
        .describe('List of files and folders'),
      totalCount: z.number().describe('Total number of items returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    let items = await client.listChildren(ctx.input.folderId);

    return {
      output: {
        items: items.map(item => ({
          itemId: item.itemId,
          name: item.name,
          mimeType: item.mimeType,
          size: item.size,
          webUrl: item.webUrl,
          modifiedAt: item.modifiedAt,
          modifiedBy: item.modifiedBy,
          isFolder: item.isFolder
        })),
        totalCount: items.length
      },
      message: `Found **${items.length}** items${ctx.input.folderId ? ` in folder \`${ctx.input.folderId}\`` : ' at the drive root'}`
    };
  })
  .build();
