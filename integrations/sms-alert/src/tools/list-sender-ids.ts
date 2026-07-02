import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { spec } from '../spec';

export let listSenderIds = SlateTool.create(spec, {
  name: 'List Sender IDs',
  key: 'list_sender_ids',
  description: `Retrieve all sender IDs assigned to your SMS Alert account. Sender IDs appear as the sender name on recipient devices.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z.any().describe('List of sender IDs assigned to the account.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient({ token: ctx.auth.token });

    ctx.info('Listing sender IDs');
    let result = await client.listSenderIds();

    return {
      output: {
        status: result.status || 'unknown',
        description: result.description || result
      },
      message: `Retrieved sender IDs for the account`
    };
  })
  .build();
