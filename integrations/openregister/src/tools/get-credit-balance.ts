import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenRegisterClient } from '../lib/client';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const getCreditBalance = SlateTool.create(spec, {
  key: 'get_credit_balance',
  name: 'Get Credit Balance',
  description:
    'Read included, used, remaining, and overage API credits, paid-plan status, and the current billing or rolling period reset date.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(out.creditsOutput)
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'get credit balance',
      '/v1/credits',
      out.creditsOutput,
      {}
    );
    return { output: result, message: 'Get credit balance completed.' };
  })
  .build();
