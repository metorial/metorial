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
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      accountId: z
        .string()
        .describe(
          'Cloud account ID to retrieve. Use list_accounts to discover connected accounts.'
        )
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
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let result = await client.getCloudAccount(ctx.input.accountId);
    let data = result;

    return {
      output: { account: data },
      message: `Retrieved cloud account **${ctx.input.accountId}**.`
    };
  })
  .build();
