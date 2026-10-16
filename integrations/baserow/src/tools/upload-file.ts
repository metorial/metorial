import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { spec } from '../spec';

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File via URL',
  key: 'upload_file',
  description: `Upload a file to Baserow by providing a publicly accessible URL. Baserow will download the file and store it. The returned file object can then be used in file fields when creating or updating rows.`,
  instructions: [
    'The URL must be publicly accessible for Baserow to download.',
    'After uploading, use the returned file object in a file field value when creating or updating rows.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      fileUrl: z.string().describe('Publicly accessible URL of the file to upload')
    })
  )
  .output(
    z.object({
      uploadedFile: z
        .object({
          url: z.string().describe('URL of the uploaded file on Baserow'),
          name: z
            .string()
            .describe('Stored file name to use when assigning this file to a row'),
          size: z.number().optional().describe('File size in bytes'),
          mimeType: z.string().optional().describe('MIME type of the file'),
          isImage: z.boolean().optional().describe('Whether the file is an image')
        })
        .catchall(z.any())
        .describe('The uploaded file object')
    })
  )
  .handleInvocation(async ctx => {
    let client = getClient(ctx);

    let file = await client.uploadFileViaUrl(ctx.input.fileUrl);

    return {
      output: {
        uploadedFile: {
          ...file,
          url: file.url,
          name: file.name,
          size: file.size,
          mimeType: file.mime_type,
          isImage: file.is_image
        }
      },
      message: `Uploaded file **${file.original_name ?? file.name}** from URL.`
    };
  })
  .build();
