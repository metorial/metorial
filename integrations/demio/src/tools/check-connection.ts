import { SlateTool } from 'slates';
import { z } from 'zod';
import { DemioClient } from '../lib/client';
import { spec } from '../spec';

export let checkConnection = SlateTool.create(spec, {
  name: 'Check Connection',
  key: 'check_connection',
  description:
    'Verify that the Demio API key and secret can access an active account. Indicates sandbox credentials when Demio supplies that information.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      pong: z.boolean().describe('Whether Demio accepted the credentials'),
      sandbox: z.boolean().optional().describe('Whether sandbox credentials were used')
    })
  )
  .handleInvocation(async ctx => {
    let output = await new DemioClient(ctx.auth).ping();
    return { output, message: 'Demio API connection verified.' };
  })
  .build();
