import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFile = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve a file by its ID. Files are attachments associated with various entities (notes, data, insights, docs) in Dovetail.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('The file ID to retrieve')
    })
  )
  .output(
    z.object({
      file: z.record(z.string(), z.unknown()).describe('File metadata and details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let file = await client.getFile(ctx.input.fileId);

    return {
      output: { file },
      message: `Retrieved file **${ctx.input.fileId}**.`
    };
  })
  .build();
