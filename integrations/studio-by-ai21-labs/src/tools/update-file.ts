import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      fileId: z.string().describe('ID of the file to update'),
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
    let client = new Client({ token: ctx.auth.token });

    await client.updateFile(ctx.input.fileId, {
      labels: ctx.input.labels,
      publicUrl: ctx.input.publicUrl
    });

    let f = await client.getFile(ctx.input.fileId);

    let output = {
      fileId: f.fileId ?? f.file_id ?? f.id ?? ctx.input.fileId,
      name: f.name ?? f.fileName,
      labels: f.labels,
      publicUrl: f.publicUrl ?? f.public_url
    };

    return {
      output,
      message: `Updated file **${output.name ?? ctx.input.fileId}**.`
    };
  })
  .build();
