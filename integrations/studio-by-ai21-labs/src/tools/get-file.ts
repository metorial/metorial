import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fileSchema, mapFile } from '../lib/schemas';
import { spec } from '../spec';

export let getFile = SlateTool.create(spec, {
  name: 'Get Library File',
  key: 'get_file',
  description: `Retrieve metadata for a specific file in your AI21 document library by its ID.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      fileId: z
        .string()
        .min(1)
        .describe('ID of the file to retrieve; use list_files to discover files')
    })
  )
  .output(fileSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let output = mapFile(await client.getFile(ctx.input.fileId));

    return {
      output,
      message: `Retrieved file **${output.name}** (${output.fileType ?? 'unknown type'}, ${output.status ?? 'unknown status'}).`
    };
  })
  .build();
