import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadFileTool = SlateTool.create(spec, {
  name: 'Get Download URL',
  key: 'download_file',
  description: `Retrieves a pre-authenticated, short-lived download URL for a file in OneDrive or SharePoint. Supports optional format conversion (e.g., convert to PDF). The URL can be used directly to download the file content.`,
  instructions: [
    'Provide either itemId or itemPath to identify the file.',
    'The returned URL is pre-authenticated and can be used without additional headers, but it expires after a short time.'
  ],
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
      itemId: z.string().optional().describe('Unique ID of the file'),
      itemPath: z
        .string()
        .optional()
        .describe('Path to the file (e.g. "/Documents/report.docx")'),
      format: z
        .string()
        .optional()
        .describe(
          'Convert the file to this format before download (e.g. "pdf", "html", "jpg"). Only supported for certain file types.'
        )
    })
  )
  .output(
    z.object({
      downloadUrl: z
        .string()
        .describe('Pre-authenticated short-lived URL to download the file content'),
      fileName: z.string().describe('Name of the file'),
      size: z.number().describe('Size of the file in bytes'),
      mimeType: z.string().optional().describe('MIME type of the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [item, content] = await Promise.all([
      client.getItem({
        driveId: ctx.input.driveId,
        itemId: ctx.input.itemId,
        itemPath: ctx.input.itemPath
      }),
      client.getItemContent({
        driveId: ctx.input.driveId,
        itemId: ctx.input.itemId,
        itemPath: ctx.input.itemPath,
        format: ctx.input.format
      })
    ]);

    return {
      output: {
        downloadUrl: content.downloadUrl || item['@microsoft.graph.downloadUrl'] || '',
        fileName: item.name,
        size: item.size,
        mimeType: item.file?.mimeType
      },
      message: `Download URL generated for **${item.name}**${ctx.input.format ? ` (converted to ${ctx.input.format})` : ''}.`
    };
  })
  .build();
