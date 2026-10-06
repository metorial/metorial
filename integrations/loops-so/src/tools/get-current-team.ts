import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getCurrentTeam = SlateTool.create(spec, {
  name: 'Get Current Team',
  key: 'get_current_team',
  description:
    'Verify the connected API key and return its Loops team name. The API does not provide a team ID through this endpoint.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ success: z.boolean(), teamName: z.string() }))
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).verifyApiKey();
    return { output: result, message: `Connected to Loops team **${result.teamName}**.` };
  })
  .build();
