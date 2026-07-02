import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkNpsTool = SlateTool.create(spec, {
  name: 'Check NPS Eligibility',
  key: 'check_nps',
  description: `Check whether a user is eligible to receive an NPS (Net Promoter Score) survey prompt based on your Beamer NPS settings. Returns the NPS prompt URL if the user qualifies. Useful for native mobile apps or custom NPS implementations.`,
  instructions: [
    'Provide at least one of userId, userEmail, or beamerId to identify the user.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('User ID to check'),
      userEmail: z.string().optional().describe('User email to check'),
      beamerId: z.string().optional().describe('Beamer-generated user ID to check')
    })
  )
  .output(
    z.object({
      eligible: z.boolean().describe('Whether the user is eligible for an NPS prompt'),
      npsUrl: z.string().nullable().describe('URL to display the NPS prompt, if eligible')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = (await client.checkNps({
      userId: ctx.input.userId,
      userEmail: ctx.input.userEmail,
      beamerId: ctx.input.beamerId
    })) as Record<string, unknown>;

    let eligible = !!result?.url || !!result?.showNps;
    let npsUrl = (result?.url as string) ?? null;

    return {
      output: {
        eligible,
        npsUrl
      },
      message: eligible
        ? `User **is eligible** for NPS prompt.`
        : `User is **not eligible** for NPS prompt at this time.`
    };
  })
  .build();
