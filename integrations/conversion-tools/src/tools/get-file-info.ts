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
        .describe('First lines of the file content (for text files)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let info = await client.getFileInfo(ctx.input.fileId);

    return {
      output: {
        fileName: info.name,
        fileSize: info.size,
        hasPreview: info.preview,
        previewLines: info.previewData ?? []
      },
      message: `File **${info.name}** — ${info.size} bytes.${info.preview ? ` Preview available (${info.previewData?.length ?? 0} lines).` : ' No preview available.'}`
    };
  })
  .build();
