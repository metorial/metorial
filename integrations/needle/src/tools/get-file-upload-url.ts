import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let getFileUploadUrl = SlateTool.create(spec, {
  name: 'Get File Upload URL',
  key: 'get_file_upload_url',
  description: `Generate signed upload URLs for uploading local or private files to Needle. After uploading a file to the signed URL, use the returned reference URL when adding the file to a collection.`,
  instructions: [
    'Specify the MIME content types for the files you want to upload.',
    'Upload your file to the returned uploadUrl using a PUT request.',
    'Then use the returned referenceUrl as the file URL when adding it to a collection.'
  ]
})
  .input(
    z.object({
      contentTypes: z
        .array(z.string())
        .min(1)
        .describe(
          'MIME content types of files to upload (e.g. "application/pdf", "text/plain")'
        )
    })
  )
  .output(
    z.object({
      uploadUrls: z
        .array(
          z.object({
            referenceUrl: z
              .string()
              .describe('URL to reference when adding the file to a collection'),
            uploadUrl: z.string().describe('Signed URL to upload the file to via PUT request')
          })
        )
        .describe('Signed upload URL pairs for each requested content type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeedleClient(ctx.auth.token);
    let results = await client.getUploadUrl(ctx.input.contentTypes);

    let mapped = results.map(r => ({
      referenceUrl: r.url,
      uploadUrl: r.upload_url
    }));

    return {
      output: { uploadUrls: mapped },
      message: `Generated **${mapped.length}** upload URL(s).`
    };
  })
  .build();
