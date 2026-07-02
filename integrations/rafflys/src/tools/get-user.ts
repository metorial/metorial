import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve the authenticated Rafflys user's account information. Use this to verify API key validity or fetch account details for the connected user.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique identifier of the user'),
      name: z.string().optional().describe('Display name of the user'),
      email: z.string().optional().describe('Email address of the user'),
      rawProfile: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full user profile data returned by Rafflys')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getUser();

    return {
      output: {
        userId: user.id?.toString(),
        name: user.name || user.username,
        email: user.email,
        rawProfile: user as Record<string, unknown>
      },
      message: `Retrieved account details for user **${user.name || user.username || user.id}**.`
    };
  })
  .build();
