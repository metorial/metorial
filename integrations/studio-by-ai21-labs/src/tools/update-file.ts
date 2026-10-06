import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapFile } from '../lib/schemas';
import { spec } from '../spec';

export let updateFile = SlateTool.create(spec, {
  name: 'Update Library File',
  key: 'update_file',
  description: `Update metadata of a file in your AI21 document library. You can modify labels and the public URL.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      fileId: z
        .string()
        .min(1)
        .describe('ID of the file to update; use list_files to discover files'),
      labels: z.array(z.string()).optional().describe('New labels for the file'),
      publicUrl: z.string().optional().describe('New public URL for the file')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Updated file identifier'),
      name: z.string().optional().describe('File name'),
      labels: z.array(z.string()).optional().describe('Updated labels'),
      publicUrl: z.string().optional().describe('Updated public URL')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.labels === undefined && ctx.input.publicUrl === undefined)
      throw createApiServiceError('Provide labels or publicUrl to update.');
    let client = new Client({ token: ctx.auth.token });

    await client.updateFile(ctx.input.fileId, {
      labels: ctx.input.labels,
      publicUrl: ctx.input.publicUrl
    });

    let f = mapFile(await client.getFile(ctx.input.fileId));

    let output = {
      fileId: f.fileId,
      name: f.name,
      labels: f.labels,
      publicUrl: f.publicUrl
    };

    return {
      output,
      message: `Updated file **${output.name ?? ctx.input.fileId}**.`
    };
  })
  .build();
