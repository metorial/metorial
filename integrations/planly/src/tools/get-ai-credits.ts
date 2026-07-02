import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAiCredits = SlateTool.create(spec, {
  name: 'Get AI Credits',
  key: 'get_ai_credits',
  description: `Check the number of available AI content generation credits for a team. Each AI generation consumes credits.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to check credits for')
    })
  )
  .output(
    z.object({
      credits: z.number().describe('Number of available AI credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getAiCredits(ctx.input.teamId);
    let credits = result.data ?? result ?? 0;

    return {
      output: { credits: typeof credits === 'number' ? credits : 0 },
      message: `${credits} AI credit(s) available.`
    };
  });
