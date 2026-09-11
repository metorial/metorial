import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

export let downloadFileTool = SlateTool.create(spec, {
  name: 'Get Download URL',
  key: 'download_file',
  description: `Get a downloadable **non–Google Workspace** file from Drive, along with its browser download URL. For Docs, Sheets, or Slides, use **Export File** instead.`,
  instructions: [
    'Download the file using the connected Google account’s access.',
    'The returned `downloadUrl` is Google Drive’s browser download link.',
    'To use the browser link, open it while signed into a Google account that has access to the file.'
  ],
  constraints: [
    'Google Docs/Sheets/Slides (and other `application/vnd.google-apps.*` files) do not have a browser content link. Use **Export File** (e.g. `text/plain` or `application/pdf`) instead.',
    'Google Drive permissions and owner download restrictions still apply.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.downloadFile)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to download')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the file'),
      downloadUrl: z.string().describe('Google Drive browser URL for downloading the file'),
      fileName: z.string().describe('Name of the file'),
      byteLength: z.number().optional().describe('Drive-reported file size in bytes'),
      mimeType: z.string().optional().describe('MIME type reported by Google Drive')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let file = await client.getFileDownloadLink(ctx.input.fileId);

    // Drive's media URL is stable; the hub resolves the current OAuth token at download time.
    await ctx.addAttachment({
      type: 'url',
      url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.fileId)}`,
      mimeType: file.mimeType,
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      query: { alt: 'media', supportsAllDrives: 'true' }
    });

    return {
      output: file,
      message: `Prepared **${file.fileName}** for download.${file.byteLength !== undefined ? ` Drive reports ${file.byteLength} bytes.` : ''}`
    };
  })
  .build();
