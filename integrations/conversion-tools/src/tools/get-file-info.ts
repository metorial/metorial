import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFileInfo = SlateTool.create(spec, {
  name: 'Get File Info',
  key: 'get_file_info',
  description: `Retrieves metadata about a file stored on Conversion Tools, including its name, size, and a text preview (if available). Useful for verifying uploaded source files or inspecting conversion results before downloading.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z
        .string()
        .describe('The file ID to retrieve info for (from upload or task result)')
    })
  )
  .output(
    z.object({
      fileName: z.string().describe('Name of the file'),
      fileSize: z.number().describe('File size in bytes'),
      hasPreview: z.boolean().describe('Whether a text preview is available'),
      previewLines: z
        .array(z.string())
        .optional()
        .describe('First lines of the file content, when supplied for text files'),
      isSizeLimited: z
        .boolean()
        .optional()
        .describe('Whether the file exceeds the current plan limit'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Original file details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let info = await client.getFileInfo(ctx.input.fileId);

    return {
      output: {
        fileName: info.name,
        fileSize: info.size,
        hasPreview: info.previewData !== undefined,
        previewLines: info.previewData,
        isSizeLimited: info.preview,
        raw: info
      },
      message: `File **${info.name}** — ${info.size} bytes.${info.previewData !== undefined ? ` Text preview available (${info.previewData.length} lines).` : ' No text preview available.'}${info.preview ? ' The file exceeds your current plan limit.' : ''}`
    };
  })
  .build();
