import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAccountRecordings = SlateTool.create(spec, {
  key: 'list_account_recordings',
  name: 'List Account Recordings',
  description:
    'Lists recordings across the account, including their conference IDs and download URLs. Use manage_recordings to publish, unpublish, or delete a recording.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      recordings: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Original recording metadata from the provider')
    })
  )
  .handleInvocation(async ctx => {
    let recordings = await new Client({ token: ctx.auth.token }).listAccountRecordings();
    return {
      output: { recordings },
      message: `Found **${recordings.length}** account recording(s).`
    };
  })
  .build();
