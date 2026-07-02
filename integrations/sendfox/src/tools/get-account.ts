import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve the authenticated user's profile information including name, email, country, timezone, and language settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('User ID'),
      name: z.string().describe('User name'),
      email: z.string().describe('User email'),
      country: z.string().nullable().describe('User country'),
      timezone: z.string().nullable().describe('User timezone'),
      language: z.string().nullable().describe('User language')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let user = await client.getMe();

    return {
      output: {
        userId: user.id,
        name: user.name,
        email: user.email,
        country: user.country,
        timezone: user.timezone,
        language: user.language
      },
      message: `Authenticated as **${user.name}** (${user.email}).`
    };
  })
  .build();
