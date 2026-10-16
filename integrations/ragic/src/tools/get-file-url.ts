import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let getFileUrl = SlateTool.create(spec, {
  name: 'Get File Download URL',
  key: 'get_file_url',
  description: `Prepare a downloadable file or image from a Ragic record and return its provider URL. The file reference can be found in the record's field value for file/image fields (format: "token@filename").`,
  instructions: [
    'File references are in the format `token@filename.ext` (e.g., "Ni92W2luv@My_Picture.jpg").',
    'First retrieve the record to get the file reference value from the file/image field.',
    'When authenticated file downloads are enabled in Ragic, provide tabFolder, sheetIndex, and recordId together.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tabFolder: z
        .string()
        .optional()
        .describe(
          'Folder path of the owning record; provide with sheetIndex and recordId for authenticated file downloads'
        ),
      sheetIndex: z.number().optional().describe('Sheet index of the owning record'),
      recordId: z.number().optional().describe('ID of the owning record'),
      fileReference: z
        .string()
        .describe(
          'The file reference value from a file/image field (e.g., "Ni92W2luv@My_Picture.jpg")'
        )
    })
  )
  .output(
    z.object({
      downloadUrl: z.string().describe('The full URL to download the file'),
      fileName: z.string().describe('The original file name extracted from the reference')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let { tabFolder, sheetIndex, recordId } = ctx.input;
    let hasRecord =
      tabFolder !== undefined || sheetIndex !== undefined || recordId !== undefined;
    if (
      hasRecord &&
      (tabFolder === undefined || sheetIndex === undefined || recordId === undefined)
    )
      throw createApiServiceError('Provide tabFolder, sheetIndex, and recordId together.');
    let record =
      tabFolder !== undefined && sheetIndex !== undefined && recordId !== undefined
        ? { tabFolder, sheetIndex, recordId }
        : undefined;
    let downloadUrl = client.getFileDownloadUrl(ctx.input.fileReference, record);
    let fileName = ctx.input.fileReference.includes('@')
      ? ctx.input.fileReference.split('@').slice(1).join('@')
      : ctx.input.fileReference;

    await ctx.addAttachment({ type: 'url', url: downloadUrl, ...client.getDownloadAuth() });

    return {
      output: {
        downloadUrl,
        fileName
      },
      message: `Prepared **${fileName}** for download.`
    };
  })
  .build();
