import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let getOrderReturnOptions = SlateTool.create(spec, {
  name: 'Get Order Return Options',
  key: 'get_order_return_options',
  description:
    'Discover configured return statuses and return reasons with their IDs and names before creating a return.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      reasons: z.any().describe('Unmodified return reasons response'),
      statuses: z.any().describe('Unmodified return statuses response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });
    let result = await client.getOrderReturnOptions();
    return { output: result, message: 'Retrieved order return statuses and reasons.' };
  })
  .build();
