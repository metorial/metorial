import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';
export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Read the account connected to the selected API environment and its remaining conversion credits. Requires user.read.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      username: z.string(),
      email: z.string(),
      credits: z
        .number()
        .optional()
        .describe('Remaining conversion credits when supplied by CloudConvert.'),
      environment: z.enum(['production', 'sandbox']),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const user = await client.getUser();
    return {
      output: {
        userId: user.id,
        username: user.username,
        email: user.email,
        credits: user.credits,
        environment: client.environment,
        createdAt: user.created_at
      },
      message: `Connected to CloudConvert ${client.environment} account ${user.id}.`
    };
  })
  .build();
