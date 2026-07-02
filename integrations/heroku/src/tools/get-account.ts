import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve the authenticated user's Heroku account details including email, verification status, and two-factor authentication status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string().describe('Unique identifier of the account'),
      email: z.string().describe('Email address'),
      name: z.string().nullable().describe('Account display name'),
      verified: z.boolean().describe('Whether the account is verified'),
      twoFactorAuthentication: z.boolean().describe('Whether 2FA is enabled'),
      createdAt: z.string().describe('When the account was created'),
      updatedAt: z.string().describe('When the account was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let account = await client.getAccount();

    return {
      output: {
        accountId: account.accountId,
        email: account.email,
        name: account.name,
        verified: account.verified,
        twoFactorAuthentication: account.twoFactorAuthentication,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      },
      message: `Account: **${account.email}**${account.verified ? ' (verified)' : ''}.`
    };
  })
  .build();
