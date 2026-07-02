import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyCredentials = SlateTool.create(spec, {
  name: 'Verify Credentials',
  key: 'verify_credentials',
  description: `Verify your API credentials and retrieve your account information. Returns your user ID and operator name. Also checks API connectivity via a ping.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Authenticated user ID'),
      operatorName: z.string().describe('Operator name associated with the account'),
      apiReachable: z.boolean().describe('Whether the API is reachable')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let me = await client.getMe();

    let apiReachable = false;
    try {
      let pong = await client.ping();
      apiReachable = pong.ping === 'pong';
    } catch {
      apiReachable = false;
    }

    return {
      output: {
        userId: String(me.userId ?? ''),
        operatorName: me.operator ?? '',
        apiReachable
      },
      message: `Credentials verified. Operator: **${me.operator}** (User ID: ${me.userId}). API is ${apiReachable ? 'reachable' : 'not reachable'}.`
    };
  })
  .build();
