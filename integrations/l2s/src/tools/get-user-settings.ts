import { SlateTool } from 'slates';
import { z } from 'zod';
import { L2sClient } from '../lib/client';
import { spec } from '../spec';

export let getUserSettings = SlateTool.create(spec, {
  name: 'Get User Settings',
  key: 'get_user_settings',
  description: `Retrieve the authenticated user's account settings and configuration from L2S.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      settings: z.any().describe('User account settings and configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new L2sClient({ token: ctx.auth.token });

    let settings = await client.getUserSettings();

    return {
      output: {
        settings
      },
      message: `Retrieved user settings.`
    };
  })
  .build();
