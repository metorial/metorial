import { SlateTool } from 'slates';
import { z } from 'zod';
import { FluxguardClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve your Fluxguard organization account details and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountData: z.any().describe('Organization account attributes and settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FluxguardClient(ctx.auth.token);

    let result = await client.getAccount();

    return {
      output: {
        accountData: result
      },
      message: `Retrieved account information.`
    };
  })
  .build();
