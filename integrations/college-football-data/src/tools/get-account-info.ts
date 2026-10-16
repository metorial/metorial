import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description:
    'Retrieve the authenticated account’s access tier, feature availability, and remaining API calls. Does not expose an email address or user ID.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      account: z.any().describe('Full authenticated account access and quota information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let account = await client.getAccountInfo();
    return {
      output: { account },
      message: 'Retrieved account access and API quota information.'
    };
  })
  .build();
