import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseData, teamIdSchema } from '../lib/responses';
import { spec } from '../spec';

export let getAiCredits = SlateTool.create(spec, {
  name: 'Get AI Credits',
  key: 'get_ai_credits',
  description: `Check the number of available AI content generation credits for a team. Each AI generation consumes credits. Call list_teams to discover the team ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: teamIdSchema
    })
  )
  .output(
    z.object({
      credits: z.number().describe('Number of available AI credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let credits = responseData(await client.getAiCredits(ctx.input.teamId));
    if (typeof credits !== 'number' || !Number.isFinite(credits)) {
      throw createApiServiceError('Planly returned missing or invalid AI credits.');
    }
    return { output: { credits }, message: `${credits} AI credit(s) available.` };
  });
