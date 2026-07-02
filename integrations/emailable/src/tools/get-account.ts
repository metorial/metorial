import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve account information including the owner's email address and the number of available email verification credits.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      ownerEmail: z.string().describe('Email address of the account owner'),
      availableCredits: z.number().describe('Number of remaining email verification credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAccount();

    return {
      output: result,
      message: `Account **${result.ownerEmail}** has **${result.availableCredits.toLocaleString()}** verification credits remaining.`
    };
  })
  .build();
