import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

export let updateUserProfile = SlateTool.create(spec, {
  name: 'Update User Profile',
  key: 'update_user_profile',
  description: `Update profile properties for an end-user in Appcues. Properties are applied synchronously and immediately available for flow targeting and personalization. Pass key-value pairs to set or update.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('The unique identifier of the user'),
      properties: z
        .record(z.string(), z.any())
        .describe('Key-value pairs of profile properties to set or update')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The user ID that was updated'),
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    await client.updateUserProfile(ctx.input.userId, ctx.input.properties);

    return {
      output: {
        userId: ctx.input.userId,
        success: true
      },
      message: `Updated **${Object.keys(ctx.input.properties).length}** properties for user \`${ctx.input.userId}\`.`
    };
  })
  .build();
