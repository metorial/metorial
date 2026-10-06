import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, optionalNumber, optionalRow, optionalText } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve information about the authenticated Hunter account including plan details, credit usage, and available searches/verifications. This is a free call.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().nullable().describe('Account email'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      planName: z.string().nullable().describe('Current plan name'),
      resetDate: z.string().nullable().describe('Date when usage resets'),
      teamId: z.number().nullable().describe('Team ID'),
      searchesUsed: z.number().nullable().describe('Number of searches used'),
      searchesAvailable: z.number().nullable().describe('Total searches available'),
      verificationsUsed: z.number().nullable().describe('Number of verifications used'),
      verificationsAvailable: z
        .number()
        .nullable()
        .describe('Total period allocation, including extra packs'),
      searchesRemaining: z.number().optional(),
      verificationsRemaining: z.number().optional(),
      creditsUsed: z.number().optional(),
      creditsAvailable: z.number().optional(),
      creditsRemaining: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const data = await new Client({ token: ctx.auth.token }).getAccount();
    const requests = optionalRow(data.requests),
      searches = optionalRow(requests.searches),
      verifications = optionalRow(requests.verifications),
      credits = optionalRow(requests.credits);
    return {
      output: {
        email: optionalText(data.email) ?? null,
        firstName: optionalText(data.first_name) ?? null,
        lastName: optionalText(data.last_name) ?? null,
        planName: optionalText(data.plan_name) ?? null,
        resetDate: optionalText(data.reset_date) ?? null,
        teamId: optionalNumber(data.team_id) ?? null,
        searchesUsed: optionalNumber(searches.used) ?? null,
        searchesAvailable: optionalNumber(searches.available) ?? null,
        verificationsUsed: optionalNumber(verifications.used) ?? null,
        verificationsAvailable: optionalNumber(verifications.available) ?? null,
        searchesRemaining: optionalNumber(searches.remaining),
        verificationsRemaining: optionalNumber(verifications.remaining),
        creditsUsed: optionalNumber(credits.used),
        creditsAvailable: optionalNumber(credits.available),
        creditsRemaining: optionalNumber(credits.remaining)
      },
      message:
        'Retrieved the authenticated Hunter account and provider-reported quota balances.'
    };
  })
  .build();
