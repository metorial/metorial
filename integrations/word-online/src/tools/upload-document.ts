import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadDocument = SlateTool.create(spec, {
  name: 'Upload Document',
  key: 'upload_document',
  description: `Upload or create a new document in OneDrive or SharePoint. Supports small file uploads by providing content directly.
Specify the target location by either a parent folder ID or folder path, along with the desired file name.
For large files, use the **Create Upload Session** tool instead.`,
  instructions: [
    'For files larger than 4MB, use the Create Upload Session tool to get a resumable upload URL.'
  ],
  constraints: ['Direct upload is limited to files up to 4MB in size.']
})
  .input(
    z.object({
      fileName: z.string().describe('Name of the file to create (e.g. "Report.docx")'),
      parentFolderId: z
        .string()
        .optional()
        .describe('ID of the parent folder. Provide either parentFolderId or folderPath.'),
      folderPath: z
        .string()
        .optional()
        .describe(
          'Path to the target folder (e.g. "/Documents"). Provide either parentFolderId or folderPath.'
        ),
      content: z
        .string()
        .describe(
          'The file content to upload (base64 encoded for binary files, or plain text)'
        ),
      contentType: z
        .string()
        .optional()
        .describe('MIME type of the content. Defaults to Word document MIME type.')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('The unique ID of the created drive item'),
      name: z.string().describe('Name of the uploaded file'),
      webUrl: z.string().optional().describe('URL to open the document in the browser'),
      size: z.number().optional().describe('File size in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    if (!ctx.input.parentFolderId && !ctx.input.folderPath) {
      throw new Error('Either parentFolderId or folderPath must be provided.');
    }

    let item: any;
    if (ctx.input.parentFolderId) {
      item = await client.uploadSmallFile(
        ctx.input.parentFolderId,
        ctx.input.fileName,
        ctx.input.content,
        ctx.input.contentType
      );
    } else {
      item = await client.uploadSmallFileByPath(
        ctx.input.folderPath!,
        ctx.input.fileName,
        ctx.input.content,
        ctx.input.contentType
      );
    }

    return {
      output: {
        itemId: item.itemId,
        name: item.name,
        webUrl: item.webUrl,
        size: item.size
      },
      message: `Uploaded **${item.name}**${item.webUrl ? ` — [Open in browser](${item.webUrl})` : ''}`
    };
  })
  .build();
