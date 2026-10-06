import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Identify the Runpod account connected by the API key and read its balance and hourly spend. Restricted API keys may lack permission for this account query.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      email: z.string().nullable(),
      balance: z.number().nullable(),
      currentSpendPerHr: z.number().nullable(),
      isTeam: z.boolean().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let user = await new RunPodClient(ctx.auth).getCurrentUser();
    return {
      output: {
        userId: user.id,
        email: user.email ?? null,
        balance: user.clientBalance ?? null,
        currentSpendPerHr: user.currentSpendPerHr ?? null,
        isTeam: user.isTeam ?? null
      },
      message: `Connected Runpod account ${user.email ?? user.id}.`
    };
  })
  .build();
