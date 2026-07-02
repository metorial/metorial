import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve metadata and details for a Word document or file stored in OneDrive or SharePoint.
Look up a document by its item ID or by its full path within the drive. Returns file metadata including name, size, URLs, and modification history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      itemId: z
        .string()
        .optional()
        .describe('The unique ID of the drive item. Provide either itemId or filePath.'),
      filePath: z
        .string()
        .optional()
        .describe(
          'The path to the file relative to the drive root (e.g. "/Documents/Report.docx"). Provide either itemId or filePath.'
        )
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('The unique ID of the drive item'),
      name: z.string().describe('File name'),
      mimeType: z.string().optional().describe('MIME type of the file'),
      size: z.number().optional().describe('File size in bytes'),
      webUrl: z.string().optional().describe('URL to open the document in the browser'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      modifiedAt: z.string().optional().describe('ISO 8601 last modified timestamp'),
      createdBy: z.string().optional().describe('Display name of the creator'),
      modifiedBy: z.string().optional().describe('Display name of the last modifier'),
      parentPath: z.string().optional().describe('Path of the parent folder'),
      downloadUrl: z
        .string()
        .optional()
        .describe('Pre-authenticated download URL (short-lived)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    if (!ctx.input.itemId && !ctx.input.filePath) {
      throw new Error('Either itemId or filePath must be provided.');
    }

    let item = ctx.input.itemId
      ? await client.getItem(ctx.input.itemId)
      : await client.getItemByPath(ctx.input.filePath!);

    return {
      output: {
        itemId: item.itemId,
        name: item.name,
        mimeType: item.mimeType,
        size: item.size,
        webUrl: item.webUrl,
        createdAt: item.createdAt,
        modifiedAt: item.modifiedAt,
        createdBy: item.createdBy,
        modifiedBy: item.modifiedBy,
        parentPath: item.parentPath,
        downloadUrl: item.downloadUrl
      },
      message: `Retrieved document **${item.name}**${item.webUrl ? ` — [Open in browser](${item.webUrl})` : ''}`
    };
  })
  .build();
