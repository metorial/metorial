import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description:
    'Delete an exact ConvertAPI temporary file and verify that it is unavailable. This does not refund conversion credits.',
  constraints: [
    'Use only a file you own. A missing or expired file reports deleted false; it is not a new deletion.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(z.object({ fileId: z.string().describe('Exact temporary file ID') }))
  .output(
    z.object({ deleted: z.boolean(), fileId: z.string(), absenceConfirmed: z.boolean() })
  )
  .handleInvocation(async ctx => {
    const client = new Client({
      token: ctx.auth.token,
      masterToken: ctx.auth.masterToken,
      region: ctx.config.region
    });
    const result = await client.deleteFile(ctx.input.fileId);
    return {
      output: { fileId: ctx.input.fileId, ...result },
      message: result.deleted
        ? 'Deleted the temporary file and confirmed it is unavailable.'
        : 'The temporary file was already missing or expired; no deletion was performed.'
    };
  })
  .build();
