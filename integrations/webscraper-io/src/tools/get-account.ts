import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve account information including the user's email, name, and remaining page credits.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().describe('Account email address'),
      firstName: z.string().describe('Account holder first name'),
      lastName: z.string().describe('Account holder last name'),
      pageCredits: z.number().describe('Remaining page credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let account = await client.getAccount();

    return {
      output: {
        email: account.email,
        firstName: account.firstname,
        lastName: account.lastname,
        pageCredits: account.page_credits
      },
      message: `Account: **${account.firstname} ${account.lastname}** (${account.email}) — **${account.page_credits}** page credits remaining.`
    };
  })
  .build();
