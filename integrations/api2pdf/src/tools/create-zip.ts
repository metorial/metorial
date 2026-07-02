import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';
import {
  api2PdfFileOutputSchema,
  fetchApi2PdfAttachment,
  fileAttachment,
  fileOutput
} from './shared';

export let createZip = SlateTool.create(spec, {
  name: 'Create ZIP Archive',
  key: 'create_zip',
  description: `Compress multiple files into a single ZIP archive. Provide URLs to the files to include and optionally specify custom file names within the archive.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      files: z
        .array(
          z.object({
            url: z.string().describe('Publicly accessible URL of the file to include'),
            fileName: z.string().optional().describe('Custom file name within the ZIP archive')
          })
        )
        .min(1)
        .describe('List of files to include in the ZIP archive'),
      fileName: z.string().optional().describe('Desired file name for the ZIP archive'),
      inline: z
        .boolean()
        .optional()
        .describe('If true, opens in browser; if false, triggers download'),
      extraHttpHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Extra HTTP headers when fetching the source files')
    })
  )
  .output(api2PdfFileOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Api2PdfClient({
      token: ctx.auth.token,
      useXlCluster: ctx.config.useXlCluster
    });

    let result = await client.createZip({
      files: ctx.input.files,
      fileName: ctx.input.fileName,
      inline: ctx.input.inline,
      extraHTTPHeaders: ctx.input.extraHttpHeaders
    });

    let file = await fetchApi2PdfAttachment(client, result, 'ZIP archive creation failed');

    return {
      output: fileOutput(result, file),
      attachments: [fileAttachment(file)],
      message: `Created ZIP archive with **${ctx.input.files.length}** file(s) (${result.mbOut} MB, ${result.seconds}s) and returned it as a Slate attachment.`
    };
  })
  .build();
