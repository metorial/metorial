import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ConvexClient } from '../lib/client';
import { spec } from '../spec';

export const downloadFile = SlateTool.create(spec, {
  key: 'download_file',
  name: 'Download File',
  description:
    'Download a Convex storage file using a deployed query that returns ctx.storage.getUrl(storageId). The query controls access to the file.',
  instructions: [
    'Pass the deployed query path and its arguments. The query must return a Convex storage URL string, not a document object.',
    'Direct Convex storage URLs grant access to anyone holding the URL until the file is deleted.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      functionPath: z
        .string()
        .describe(
          'Deployed query returning ctx.storage.getUrl(storageId), such as files:getUrl.'
        ),
      args: z
        .record(z.string(), z.any())
        .optional()
        .describe('Arguments expected by the file URL query.'),
      fileName: z.string().optional().describe('Suggested filename for the download.'),
      mimeType: z.string().optional().describe('Known MIME type of the file, if available.')
    })
  )
  .output(z.object({ fileName: z.string(), mimeType: z.string().optional() }))
  .handleInvocation(async ctx => {
    const client = new ConvexClient({
      deploymentUrl: ctx.config.deploymentUrl,
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });
    const fileName = ctx.input.fileName ?? 'convex-file';
    if (!fileName.trim() || /[/\\\r\n]/.test(fileName))
      throw createApiServiceError(
        'Provide a nonempty filename without path separators or line breaks.'
      );
    const result = await client.query(ctx.input.functionPath, ctx.input.args);
    if (result.value === null)
      throw createApiServiceError(
        'The file was not found or the query did not authorize access.'
      );
    const url = client.fileUrl(result.value);
    await ctx.addAttachment({
      type: 'url',
      url,
      filename: fileName,
      mimeType: ctx.input.mimeType
    });
    return {
      output: { fileName, mimeType: ctx.input.mimeType },
      message: 'Prepared the Convex file for download.'
    };
  })
  .build();
