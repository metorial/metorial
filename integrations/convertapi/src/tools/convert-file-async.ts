import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fileSourceSchema = z
  .object({
    url: z.string().optional().describe('Public URL of the file to convert'),
    fileId: z
      .string()
      .optional()
      .describe('ConvertAPI file ID of a previously uploaded or converted file'),
    base64Data: z.string().optional().describe('Base64-encoded file content'),
    fileName: z.string().optional().describe('File name (required when using base64Data)')
  })
  .describe(
    'File source — provide exactly one of: url, fileId, or base64Data (with fileName)'
  );

export let convertFileAsync = SlateTool.create(spec, {
  name: 'Convert File (Async)',
  key: 'convert_file_async',
  description: `Start an asynchronous file conversion job. Returns a job ID that can be used to poll for results or receive webhook notifications.
Use this for large files or long-running conversions to avoid timeouts. Retrieve results with the **Get Async Job Result** tool.`,
  instructions: [
    'Use lowercase format strings (e.g., "pdf", "docx", "jpg").',
    'Poll the returned jobId with the get_async_job_result tool to check completion.'
  ],
  constraints: ['Job results are available for 3 hours after completion.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceFormat: z
        .string()
        .describe('Source file format extension (e.g., "docx", "html", "png")'),
      destinationFormat: z
        .string()
        .describe('Target file format extension (e.g., "pdf", "jpg", "xlsx")'),
      file: fileSourceSchema,
      storeFile: z
        .boolean()
        .optional()
        .default(true)
        .describe('Store converted file on ConvertAPI server for download'),
      conversionParameters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Format-specific conversion parameters')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Async job ID for polling or webhook tracking')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);

    let result = await client.convertAsync({
      sourceFormat: ctx.input.sourceFormat,
      destinationFormat: ctx.input.destinationFormat,
      files: [fileSource],
      storeFile: ctx.input.storeFile,
      parameters: ctx.input.conversionParameters
    });

    return {
      output: result,
      message: `Async conversion **${ctx.input.sourceFormat}** → **${ctx.input.destinationFormat}** started. Job ID: \`${result.jobId}\`. Use get_async_job_result to check the status.`
    };
  })
  .build();

function buildFileSource(file: {
  url?: string;
  fileId?: string;
  base64Data?: string;
  fileName?: string;
}) {
  if (file.url) {
    return { type: 'url' as const, url: file.url };
  }
  if (file.fileId) {
    return { type: 'fileId' as const, fileId: file.fileId };
  }
  if (file.base64Data && file.fileName) {
    return { type: 'base64' as const, fileName: file.fileName, data: file.base64Data };
  }
  throw new Error('Provide exactly one of: url, fileId, or base64Data (with fileName)');
}
