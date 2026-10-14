import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDeviceToken = SlateTool.create(spec, {
  name: 'Delete Device Token',
  key: 'delete_device_token',
  description:
    'Removes a registered device token from an Engage user profile, for example when the user logs out of a mobile application. Call get_user to see the registered device tokens.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      uid: z.string().min(1).describe('Application-supplied user UID'),
      deviceToken: z
        .string()
        .min(1)
        .describe('Device token to remove; discover it with get_user')
    })
  )
  .output(
    z.object({
      uid: z.string().describe('User UID'),
      deleted: z.boolean().describe('Whether the delete request succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, secret: ctx.auth.secret });
    await client.deleteDeviceToken(ctx.input.uid, ctx.input.deviceToken);

    return {
      output: { uid: ctx.input.uid, deleted: true },
      message: `Removed the device token from user **${ctx.input.uid}**.`
    };
  })
  .build();
