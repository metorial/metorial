import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `Lists files in the account's file library. Optionally filter files associated with a specific conference room.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roomId: z
        .string()
        .optional()
        .describe('Optional conference room ID to list only files for that room')
    })
  )
  .output(
    z.object({
      files: z.array(z.record(z.string(), z.unknown())).describe('List of files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.roomId) {
      result = await client.listConferenceFiles(ctx.input.roomId);
    } else {
      result = await client.listFiles();
    }

    let files = Array.isArray(result) ? result : [];

    return {
      output: { files },
      message: `Found **${files.length}** file(s)${ctx.input.roomId ? ` for room ${ctx.input.roomId}` : ''}.`
    };
  })
  .build();
