import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapUser, userOutputSchema } from '../lib/mappers';
import { spec } from '../spec';
export const getUserTool = SlateTool.create(spec, {
  key: 'get_user',
  name: 'Get User',
  description: 'Get User. Uses Harvest v3 permissions and verified resource IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      userId: z.string().describe('The Greenhouse user ID')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    return {
      output: mapUser(
        await new GreenhouseClient(ctx.auth, ctx.config).getUser(ctx.input.userId)
      ),
      message: 'Retrieved the requested user.'
    };
  })
  .build();
