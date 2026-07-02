import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFileUrl = SlateTool.create(spec, {
  name: 'Get File Download URL',
  key: 'get_file_url',
  description: `Generate a download URL for a file or image uploaded to a Ragic record. The file reference can be found in the record's field value for file/image fields (format: "token@filename").`,
  instructions: [
    'File references are in the format `token@filename.ext` (e.g., "Ni92W2luv@My_Picture.jpg").',
    'First retrieve the record to get the file reference value from the file/image field, then use this tool to generate the download URL.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
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
    let client = new Client({
      token: ctx.auth.token,
      serverDomain: ctx.config.serverDomain,
      accountName: ctx.config.accountName
    });

    let downloadUrl = client.getFileDownloadUrl(ctx.input.fileReference);
    let fileName = ctx.input.fileReference.includes('@')
      ? ctx.input.fileReference.split('@').slice(1).join('@')
      : ctx.input.fileReference;

    return {
      output: {
        downloadUrl,
        fileName
      },
      message: `Generated download URL for file **${fileName}**: [Download](${downloadUrl})`
    };
  })
  .build();
