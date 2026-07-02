import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve an end-user's profile from Appcues. Returns all stored profile properties for the user, which are used for experience targeting and personalization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The unique identifier of the user')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The user ID'),
      properties: z.record(z.string(), z.any()).describe('All profile properties for the user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let profile = await client.getUserProfile(ctx.input.userId);

    return {
      output: {
        userId: ctx.input.userId,
        properties: profile || {}
      },
      message: `Retrieved profile for user \`${ctx.input.userId}\` with **${Object.keys(profile || {}).length}** properties.`
    };
  })
  .build();
