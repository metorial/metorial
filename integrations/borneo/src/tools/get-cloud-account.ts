import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCloudAccount = SlateTool.create(spec, {
  name: 'Get Cloud Account',
  key: 'get_cloud_account',
  description: `Retrieve configuration and status details for a connected cloud account. Provides visibility into the cloud account's integration status and settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Cloud account ID to retrieve')
    })
  )
  .output(
    z
      .object({
        account: z.any().describe('Cloud account details')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getCloudAccount(ctx.input.accountId);
    let data = result?.data ?? result;

    return {
      output: { account: data },
      message: `Retrieved cloud account **${ctx.input.accountId}**.`
    };
  })
  .build();
