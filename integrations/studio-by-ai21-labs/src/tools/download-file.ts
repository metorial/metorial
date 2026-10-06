import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fileSchema, mapFile } from '../lib/schemas';
import { spec } from '../spec';
import { downloadDetails } from './get-file-url';

export const downloadFile = SlateTool.create(spec, {
  name: 'Download Library File',
  key: 'download_file',
  description:
    'Prepare a library file for download and return its metadata. Use list_files or upload_file to obtain the file ID.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      fileId: z.string().min(1).describe('File ID returned by list_files or upload_file')
    })
  )
  .output(fileSchema)
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth);
    const output = mapFile(await client.getFile(ctx.input.fileId));
    if (output.status === 'DB_RECORD_CREATED' || output.status === 'UPLOAD_FAILED')
      throw createApiServiceError(
        'The file has not uploaded successfully. Check get_file for processing details.'
      );
    const details = await downloadDetails(client, ctx.input.fileId);
    await ctx.addAttachment({
      type: 'url',
      url: details.url,
      filename: output.name,
      refreshAt: details.expiresAt,
      refreshReference: { fileId: output.fileId }
    });
    return { output, message: `Prepared **${output.name}** for download.` };
  })
  .build();
