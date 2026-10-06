import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { accountInput } from '../lib/contracts';
import { spec } from '../spec';
export const deleteCustomAudience = SlateTool.create(spec, {
  key: 'delete_custom_audience',
  name: 'Delete Custom Audience',
  description:
    'Delete an exact custom audience after verifying its account association. The provider’s 204 acknowledgment does not assert erasure of historic advertising records.',
  tags: { destructive: true }
})
  .input(z.object({ accountId: accountInput, audienceId: z.string() }))
  .output(z.object({ audienceId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await createClient(ctx).deleteAudience(ctx.input.audienceId);
    return {
      output: { audienceId: ctx.input.audienceId, deleted: true },
      message:
        'Reddit acknowledged custom-audience deletion. Verify absence before reusing dependent workflows.'
    };
  })
  .build();
