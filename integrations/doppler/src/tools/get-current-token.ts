import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentToken = SlateTool.create(spec, {
  key: 'get_current_token',
  name: 'Get Current Token',
  description:
    'Retrieve information about the authenticated Doppler token, including its workplace and token type when provided. Useful for checking the identity associated with this connection.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      token: z
        .record(z.string(), z.unknown())
        .describe(
          'Token identity metadata returned by Doppler, including workplace information when available'
        )
    })
  )
  .handleInvocation(async ctx => {
    let token = await new DopplerClient({ token: ctx.auth.token }).getCurrentToken();
    return { output: { token }, message: 'Retrieved the current Doppler token identity.' };
  })
  .build();
