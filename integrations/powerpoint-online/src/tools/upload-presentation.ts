import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { driveItemOutputSchema, mapDriveItem } from '../lib/schemas';
import { spec } from '../spec';

export let uploadPresentation = SlateTool.create(spec, {
  name: 'Upload Presentation',
  key: 'upload_presentation',
  description: `Upload a PowerPoint presentation file to OneDrive or SharePoint. For small files (< 4MB), provide base64-encoded file content directly. For large files, use the **createUploadSession** mode to get an upload URL for chunked uploads.`,
  instructions: [
    'For small files, provide the file content as a base64-encoded string in the "fileContent" field.',
    'For large files (> 4MB), set "mode" to "session" and provide "fileSize" to receive an upload URL for chunked upload.'
  ],
  constraints: [
    'Simple upload supports files up to 4MB. Use upload sessions for larger files.'
  ]
})
  .input(
    z.object({
      fileName: z
        .string()
        .describe('Name of the file including extension, e.g. "Quarterly Report.pptx"'),
      mode: z
        .enum(['simple', 'session'])
        .default('simple')
        .describe(
          'Upload mode: "simple" for small files with content provided, "session" to create a resumable upload session for large files.'
        ),
      fileContent: z
        .string()
        .optional()
        .describe('Base64-encoded file content. Required for "simple" mode.'),
      fileSize: z
        .number()
        .optional()
        .describe('Total file size in bytes. Required for "session" mode.'),
      contentType: z
        .string()
        .optional()
        .describe('MIME type of the file. Defaults to PowerPoint PPTX format.'),
      parentFolderId: z
        .string()
        .optional()
        .describe('ID of the destination folder. Omit to upload to the drive root.'),
      parentFolderPath: z
        .string()
        .optional()
        .describe(
          'Path of the destination folder, e.g. "/Documents/Presentations". Omit to upload to the drive root.'
        ),
      driveId: z
        .string()
        .optional()
        .describe("ID of the target drive. Omit to use the current user's OneDrive."),
      siteId: z
        .string()
        .optional()
        .describe(
          "SharePoint site ID. If provided, uploads to the site's default document library."
        ),
      conflictBehavior: z
        .enum(['rename', 'replace', 'fail'])
        .optional()
        .describe('Behavior when a file with the same name exists. Default: "rename".')
    })
  )
  .output(
    z.object({
      uploadedFile: driveItemOutputSchema
        .optional()
        .describe('Metadata of the uploaded file (for simple upload)'),
      uploadUrl: z.string().optional().describe('Resumable upload URL (for session mode)'),
      uploadExpiration: z
        .string()
        .optional()
        .describe('Expiration time of the upload session (for session mode)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient(ctx.auth.token);

    if (ctx.input.mode === 'session') {
      if (!ctx.input.fileSize) {
        throw new Error('fileSize is required when using session upload mode');
      }

      let session = await client.createUploadSession({
        fileName: ctx.input.fileName,
        parentId: ctx.input.parentFolderId,
        parentPath: ctx.input.parentFolderPath,
        driveId: ctx.input.driveId,
        siteId: ctx.input.siteId,
        conflictBehavior: ctx.input.conflictBehavior,
        fileSize: ctx.input.fileSize
      });

      return {
        output: {
          uploadUrl: session.uploadUrl,
          uploadExpiration: session.expirationDateTime
        },
        message: `Upload session created for **${ctx.input.fileName}**. Use the upload URL to send file chunks.`
      };
    }

    if (!ctx.input.fileContent) {
      throw new Error('fileContent is required when using simple upload mode');
    }

    let item = await client.uploadSmallFile({
      fileName: ctx.input.fileName,
      content: ctx.input.fileContent,
      contentType: ctx.input.contentType,
      parentId: ctx.input.parentFolderId,
      parentPath: ctx.input.parentFolderPath,
      driveId: ctx.input.driveId,
      siteId: ctx.input.siteId,
      conflictBehavior: ctx.input.conflictBehavior
    });

    let output = mapDriveItem(item);

    return {
      output: {
        uploadedFile: output
      },
      message: `Uploaded **${output.name}** successfully`
    };
  })
  .build();
