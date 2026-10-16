import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProfileTool = SlateTool.create(spec, {
  name: 'Update Profile Biography',
  key: 'update_profile_biography',
  description:
    'Update the authenticated SmugMug user’s public biography. An empty biography clears the text.',
  tags: { destructive: false }
})
  .input(
    z.object({
      bioText: z.string().describe('Public biography text; use an empty string to clear it')
    })
  )
  .output(z.object({ nickname: z.string(), profile: z.record(z.string(), z.any()) }))
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let user = await client.getAuthenticatedUser();
    let profile = await client.updateUserProfile(user.NickName, {
      BioText: ctx.input.bioText
    });
    return {
      output: { nickname: user.NickName, profile },
      message: `Updated the biography for **${user.NickName}**.`
    };
  })
  .build();
