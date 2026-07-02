import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Get information about the currently authenticated Replicate account, including username, name, and account type.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountType: z.string().describe('Account type (user or organization)'),
      username: z.string().describe('Account username'),
      accountName: z.string().optional().describe('Display name'),
      githubUrl: z.string().optional().nullable().describe('Associated GitHub URL'),
      avatarUrl: z.string().optional().nullable().describe('Avatar image URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getAccount();

    return {
      output: {
        accountType: result.type,
        username: result.username,
        accountName: result.name,
        githubUrl: result.github_url,
        avatarUrl: result.avatar_url
      },
      message: `Authenticated as **${result.username}** (${result.type}).`
    };
  })
  .build();
