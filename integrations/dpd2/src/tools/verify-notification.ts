import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyNotification = SlateTool.create(spec, {
  name: 'Verify Notification',
  key: 'verify_notification',
  description: `Verify that an incoming purchase notification (IPN) genuinely originated from DPD. Pass all parameters received from the notification POST to confirm authenticity. The response indicates whether the notification is VERIFIED or INVALID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      notificationParams: z
        .record(z.string(), z.any())
        .describe(
          'All parameters received from the DPD notification POST, passed through for verification'
        )
    })
  )
  .output(
    z.object({
      verified: z.boolean().describe('Whether the notification was verified as genuine'),
      result: z.string().describe('Raw verification result: VERIFIED or INVALID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.verifyNotification(ctx.input.notificationParams);

    return {
      output: result,
      message: `Notification verification: **${result.result}**.`
    };
  })
  .build();
