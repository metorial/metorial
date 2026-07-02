import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteAccount = SlateTool.create(spec, {
  name: 'Delete Account',
  key: 'delete_account',
  description: 'Deletes an ActiveCampaign account/company by ID.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z.string().describe('ID of the account to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    await client.deleteAccount(ctx.input.accountId);

    return {
      output: { deleted: true },
      message: `Account (ID: ${ctx.input.accountId}) has been deleted.`
    };
  })
  .build();
