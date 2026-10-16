import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, userInfoSchema } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description: 'Retrieve the current OAuth user and connected Dub workspace.',
  tags: { readOnly: true }
})
  .authMethods(['oauth'])
  .input(z.object({}))
  .output(userInfoSchema)
  .handleInvocation(async ctx => {
    let profile = await new Client(ctx.auth).getCurrentUser();
    return {
      output: profile,
      message: `Connected to **${profile.workspace.name}** as **${profile.name ?? profile.id}**`
    };
  })
  .build();
