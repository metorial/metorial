import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account',
  description: `Retrieve your Stability AI account information including user details, remaining credit balance, and organization memberships.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique user identifier'),
      email: z.string().describe('User email address'),
      profilePicture: z.string().describe('URL of the user profile picture'),
      credits: z.number().describe('Remaining credit balance'),
      organizations: z
        .array(
          z.object({
            organizationId: z.string().describe('Organization identifier'),
            name: z.string().describe('Organization name'),
            role: z.string().describe('User role in the organization'),
            isDefault: z.boolean().describe('Whether this is the default organization')
          })
        )
        .describe('List of organization memberships')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let [account, balance] = await Promise.all([client.getAccount(), client.getBalance()]);

    let output = {
      ...account,
      credits: balance.credits
    };

    return {
      output,
      message: `Account: **${account.email}** — **${balance.credits}** credits remaining.`
    };
  })
  .build();
