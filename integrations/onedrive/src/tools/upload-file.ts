import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadFileTool = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Uploads a file to OneDrive or SharePoint. Supports simple upload for text/small content. For large file uploads, use the "Create Upload Session" tool instead. The destination can be specified by parent folder ID or path.`,
  instructions: [
    'Provide either parentId or parentPath to specify the destination folder. Omit both to upload to the drive root.',
    'For files larger than 4 MB, use the create_upload_session tool instead.'
  ],
  constraints: ['Simple upload is limited to files up to 4 MB in size.']
})
  .input(
    z.object({
      driveId: z
        .string()
        .optional()
        .describe("ID of the drive. Defaults to the user's personal OneDrive."),
      parentId: z.string().optional().describe('ID of the destination folder'),
      parentPath: z
        .string()
        .optional()
        .describe('Path of the destination folder (e.g. "/Documents")'),
      fileName: z.string().describe('Name for the uploaded file including extension'),
      content: z
        .string()
        .describe('File content as a string (text content or base64-encoded binary)'),
      contentType: z
        .string()
        .optional()
        .describe('MIME type of the file (e.g. "text/plain", "application/pdf")'),
      conflictBehavior: z
        .enum(['rename', 'replace', 'fail'])
        .optional()
        .describe('What to do if a file with the same name exists. Defaults to "fail".')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Unique ID of the uploaded file'),
      name: z.string().describe('Name of the uploaded file'),
      size: z.number().describe('Size of the uploaded file in bytes'),
      webUrl: z.string().describe('URL to view the file in a browser'),
      createdDateTime: z.string().describe('ISO 8601 creation timestamp'),
      lastModifiedDateTime: z.string().describe('ISO 8601 last modified timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let item = await client.uploadSmallFile({
      driveId: ctx.input.driveId,
      parentId: ctx.input.parentId,
      parentPath: ctx.input.parentPath,
      fileName: ctx.input.fileName,
      content: ctx.input.content,
      contentType: ctx.input.contentType,
      conflictBehavior: ctx.input.conflictBehavior
    });

    return {
      output: {
        itemId: item.id,
        name: item.name,
        size: item.size,
        webUrl: item.webUrl,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime
      },
      message: `Uploaded **${item.name}** (${item.size} bytes).`
    };
  })
  .build();
