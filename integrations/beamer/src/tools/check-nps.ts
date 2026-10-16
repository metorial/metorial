import { createApiServiceError, SlateTool } from 'slates';
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
      beamerId: z.string().optional().describe('Beamer-generated user ID to check'),
      userFirstName: z.string().optional().describe('User first name'),
      userLastName: z.string().optional().describe('User last name'),
      filter: z.string().optional().describe('User segmentation filters'),
      url: z.string().optional().describe('Current page URL for the user'),
      createdAt: z.string().optional().describe('User signup date (ISO-8601)'),
      language: z.string().optional().describe('User language'),
      mobile: z.boolean().optional().describe('Whether the user is on a mobile device'),
      multi: z
        .boolean()
        .optional()
        .describe('Treat different user IDs on a device as separate users')
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
    if (
      ![ctx.input.userId, ctx.input.userEmail, ctx.input.beamerId].some(value => value?.trim())
    ) {
      throw createApiServiceError(
        'Provide userId, userEmail, or beamerId to identify the user.'
      );
    }
    let result = await client.checkNps(ctx.input);
    let eligible = result.shouldShow;
    let npsUrl = result.url ?? null;

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
