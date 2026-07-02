import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCookies = SlateTool.create(spec, {
  name: 'Update Robot Cookies',
  key: 'update_cookies',
  description: `Update the cookies associated with a robot. This is useful for maintaining authenticated sessions on target websites that require login. Provide the cookies as an array of cookie objects.`,
  instructions: [
    'Each cookie object should follow the standard cookie format with properties like `name`, `value`, `domain`, `path`, etc.'
  ]
})
  .input(
    z.object({
      robotId: z.string().describe('ID of the robot to update cookies for'),
      cookies: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of cookie objects to set on the robot')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the cookies were updated successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.updateCookies(ctx.input.robotId, ctx.input.cookies);

    return {
      output: {
        success: true
      },
      message: `Updated **${ctx.input.cookies.length}** cookie(s) on robot \`${ctx.input.robotId}\`.`
    };
  })
  .build();
