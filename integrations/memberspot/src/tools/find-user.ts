import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findUserTool = SlateTool.create(spec, {
  name: 'Find User by Email',
  key: 'find_user',
  description: `Look up a Memberspot member by their email address. Returns the full user profile including assigned offers and custom properties.`,
  constraints: ['Requires Enterprise plan or API add-on.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the user to find')
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.any()).describe('User profile object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let user = await client.findUserByEmail(ctx.input.email);

    return {
      output: { user },
      message: `Found user with email **${ctx.input.email}**.`
    };
  })
  .build();
