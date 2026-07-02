import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve information about the authenticated AMcards user account, including name, email, and account details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional().describe('User account ID.'),
      firstName: z.string().optional().describe('User first name.'),
      lastName: z.string().optional().describe('User last name.'),
      email: z.string().optional().describe('User email address.'),
      rawResponse: z.any().optional().describe('Full user account response from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getUser();

    return {
      output: {
        userId: result?.id != null ? String(result.id) : undefined,
        firstName: result?.first_name ?? undefined,
        lastName: result?.last_name ?? undefined,
        email: result?.email ?? undefined,
        rawResponse: result
      },
      message: `Retrieved account info for **${[result?.first_name, result?.last_name].filter(Boolean).join(' ') || 'user'}** (${result?.email || 'no email'}).`
    };
  })
  .build();
