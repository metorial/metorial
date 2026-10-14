import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentAccount = SlateTool.create(spec, {
  name: 'Get Current Account',
  key: 'get_current_account',
  description:
    'Identifies the connected Mailsoftly account and retrieves its plan limits, sending channels, and any sending restrictions.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      firmId: z.number().describe('Stable account ID associated with this API key.'),
      firmName: z.string().describe('Name of the connected account.'),
      account: z
        .any()
        .describe(
          'Account profile, limits, sending channels, and restrictions returned by Mailsoftly.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });
    let identity = await client.authenticate();
    let account = await client.getAccount();
    return {
      output: { firmId: identity.firmId, firmName: identity.firmName, account },
      message: `Connected to Mailsoftly account **${identity.firmName}** (ID ${identity.firmId}).`
    };
  })
  .build();
