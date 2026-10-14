import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: 'Retrieve the team and member accounts authorized by your Feathery API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      team: z.string().describe('Feathery team name'),
      accounts: z.array(
        z.object({
          accountId: z.string().describe('Member account ID'),
          email: z.string().describe('Member email'),
          role: z.string().describe('Member role')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region:
        ctx.auth.region ??
        ('region' in ctx.config && typeof ctx.config.region === 'string'
          ? ctx.config.region
          : undefined)
    });
    let account = await client.getAccount();
    if (typeof account.team !== 'string' || !Array.isArray(account.accounts)) {
      throw createApiServiceError(
        'Feathery did not return team account information. Check your API key and region.'
      );
    }
    return {
      output: {
        team: account.team,
        accounts: account.accounts.map((member: any) => ({
          accountId: member.id,
          email: member.email,
          role: member.role
        }))
      },
      message: `Retrieved account information for **${account.team}**.`
    };
  })
  .build();
