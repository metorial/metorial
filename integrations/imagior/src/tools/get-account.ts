import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account Details',
  key: 'get_account',
  description: `Retrieve account information for the authenticated user, including name, email, and remaining image generation credits.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      name: z.string().describe('Account holder name'),
      email: z.string().describe('Account email address'),
      remainingCredits: z.number().describe('Number of image generation credits remaining')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAccount();

    return {
      output: {
        name: result.name,
        email: result.email,
        remainingCredits: result.usage?.remainingCredits ?? 0
      },
      message: `Account: **${result.name}** (${result.email}). Remaining credits: **${result.usage?.remainingCredits ?? 0}**.`
    };
  })
  .build();
