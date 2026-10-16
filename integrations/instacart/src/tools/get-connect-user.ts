import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/connect-client';
import { spec } from '../spec';

export let getConnectUser = SlateTool.create(spec, {
  key: 'get_connect_user',
  name: 'Get Connect User',
  description:
    'Retrieve a fulfillment customer by the user ID your retailer application provided when creating the user. Requires Connect OAuth with connect:fulfillment. This customer is not the owner of the API credentials.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ userId: z.string().describe('Retailer-generated Connect user ID') }))
  .output(
    z.object({
      userId: z.string().describe('Requested retailer-generated user ID'),
      firstName: z.string(),
      lastName: z.string().optional(),
      phoneNumber: z.string().optional(),
      raw: z.unknown().optional().describe('Complete provider user data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      baseUrl: ctx.auth.baseUrl
    });
    let user = await client.getUser(ctx.input.userId);
    return { output: user, message: `Retrieved Connect user **${ctx.input.userId}**.` };
  })
  .build();
