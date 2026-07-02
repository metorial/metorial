import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

export let uploadFileTool = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Upload a file with content to Google Drive. Provide file content as plain text or base64-encoded string. The file will be created with the given name, metadata MIME type, and optional parent folder.`,
  instructions: [
    'For text files (JSON, CSV, HTML, etc.), use contentEncoding "text" and provide the content directly.',
    'For binary files, use contentEncoding "base64" and provide the base64-encoded content.',
    'To convert uploaded text into a Google Workspace file, set mimeType to a Google Workspace target MIME type such as "application/vnd.google-apps.document" and set sourceMimeType to the uploaded content MIME type such as "text/plain" or "text/markdown".'
  ],
  constraints: [
    'File content must be provided as a string. For binary content, encode as base64 first.'
  ]
})
  .scopes(googleDriveActionScopes.uploadFile)
  .input(
    z.object({
      name: z.string().describe('File name including extension'),
      content: z.string().describe('File content as text or base64-encoded string'),
      contentEncoding: z
        .enum(['text', 'base64'])
        .default('text')
        .describe('How the content is encoded'),
      mimeType: z
        .string()
        .optional()
        .describe(
          'Drive metadata MIME type. Use a Google Workspace MIME type such as "application/vnd.google-apps.document" to request conversion, or a normal file MIME type such as "text/plain" or "application/pdf" for binary/file uploads.'
        ),
      sourceMimeType: z
        .string()
        .optional()
        .describe(
          'MIME type of the uploaded media content. Use this when mimeType is a Google Workspace target MIME type; for example, sourceMimeType "text/markdown" with mimeType "application/vnd.google-apps.document".'
        ),
      parentFolderIds: z
        .array(z.string())
        .optional()
        .describe('Parent folder IDs to upload into'),
      description: z.string().optional().describe('Description for the file')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the uploaded file'),
      name: z.string(),
      mimeType: z.string(),
      webViewLink: z.string().optional(),
      webContentLink: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let file = await client.uploadFile({
      name: ctx.input.name,
      content: ctx.input.content,
      contentEncoding: ctx.input.contentEncoding,
      mimeType: ctx.input.mimeType,
      sourceMimeType: ctx.input.sourceMimeType,
      parents: ctx.input.parentFolderIds,
      description: ctx.input.description
    });

    return {
      output: {
        fileId: file.fileId,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink
      },
      message: `Uploaded **${file.name}** (${file.mimeType}) with ID \`${file.fileId}\`.`
    };
  })
  .build();
