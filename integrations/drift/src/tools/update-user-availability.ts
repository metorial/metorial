import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let updateUserAvailability = SlateTool.create(spec, {
  name: 'Update User Availability',
  key: 'update_user_availability',
  description: `Update a Drift user's availability. This is useful for external routing systems that need to mark an agent available or offline.`,
  instructions: ['User roles cannot be updated through the Drift API.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('Drift user ID to update'),
      availability: z
        .enum(['AVAILABLE', 'OFFLINE'])
        .describe('New availability value for the Drift user')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('Drift user ID'),
      availability: z.string().optional().describe('Updated availability'),
      name: z.string().optional().describe('User name'),
      email: z.string().optional().describe('User email address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);
    let user = await client.updateUser(ctx.input.userId, {
      availability: ctx.input.availability
    });

    return {
      output: {
        userId: user.id,
        availability: user.availability,
        name: user.name,
        email: user.email
      },
      message: `Updated user \`${ctx.input.userId}\` availability to **${ctx.input.availability}**.`
    };
  })
  .build();
