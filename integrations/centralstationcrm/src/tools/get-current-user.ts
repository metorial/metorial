import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated CentralStationCRM user, current account, and accessible account names.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('Authenticated user ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Login email address'),
      currentAccount: z.string().optional().describe('Current account subdomain'),
      accounts: z.array(z.string()).describe('Accessible account subdomains'),
      timezone: z.string().optional().describe('Selected time zone')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, accountName: ctx.config.accountName });
    let result = await client.getCurrentUser();
    let user = result?.user ?? result;
    return {
      output: {
        userId: user.id,
        firstName: user.first ?? undefined,
        lastName: user.last ?? undefined,
        email: user.name ?? undefined,
        currentAccount: user.current_account ?? undefined,
        accounts: user.accounts ?? [],
        timezone: user.timezone ?? undefined
      },
      message: `Retrieved current user (ID: ${user.id}).`
    };
  })
  .build();
