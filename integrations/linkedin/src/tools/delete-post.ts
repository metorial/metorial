import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinkedInClient } from '../lib/client';
import { spec } from '../spec';

export let deletePost = SlateTool.create(spec, {
  name: 'Delete Post',
  key: 'delete_post',
  description: `Delete a post from LinkedIn by its URN. The authenticated user must be the author of the post or an admin of the organization that authored it.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      postUrn: z
        .string()
        .describe(
          'URN of the post to delete, e.g. "urn:li:share:12345" or "urn:li:ugcPost:12345"'
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the post was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });
    await client.deletePost(ctx.input.postUrn);

    return {
      output: { deleted: true },
      message: `Deleted post \`${ctx.input.postUrn}\`.`
    };
  })
  .build();
