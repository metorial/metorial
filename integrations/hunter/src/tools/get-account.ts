import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      verificationsAvailable: z.number().nullable().describe('Total verifications available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getAccount();

    return {
      output: {
        email: data.email ?? null,
        firstName: data.first_name ?? null,
        lastName: data.last_name ?? null,
        planName: data.plan_name ?? null,
        resetDate: data.reset_date ?? null,
        teamId: data.team_id ?? null,
        searchesUsed: data.requests?.searches?.used ?? null,
        searchesAvailable: data.requests?.searches?.available ?? null,
        verificationsUsed: data.requests?.verifications?.used ?? null,
        verificationsAvailable: data.requests?.verifications?.available ?? null
      },
      message: `Account: **${data.email}** on **${data.plan_name}** plan. Searches: ${data.requests?.searches?.used ?? 0}/${data.requests?.searches?.available ?? 0}. Verifications: ${data.requests?.verifications?.used ?? 0}/${data.requests?.verifications?.available ?? 0}.`
    };
  })
  .build();
