import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List all connected social media accounts in the workspace. Returns account names, providers, usernames, and authorization status. Use this to get account IDs needed for creating or updating posts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            accountId: z.number().optional().describe('Numeric ID of the account'),
            accountUuid: z.string().optional().describe('UUID of the account'),
            name: z.string().optional().describe('Display name of the account'),
            username: z.string().optional().describe('Username on the social platform'),
            provider: z
              .string()
              .optional()
              .describe(
                'Social media provider (e.g. facebook_page, instagram, linkedin, twitter, tiktok, pinterest, youtube, mastodon)'
              ),
            image: z.string().optional().describe('Profile image URL'),
            authorized: z
              .boolean()
              .optional()
              .describe('Whether the account connection is authorized'),
            createdAt: z.string().optional().describe('When the account was connected')
          })
        )
        .describe('Array of connected social media accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.listAccounts();
    let accounts = (result?.data ?? []).map((a: any) => ({
      accountId: a.id,
      accountUuid: a.uuid,
      name: a.name,
      username: a.username,
      provider: a.provider,
      image: a.image,
      authorized: a.authorized,
      createdAt: a.created_at
    }));

    return {
      output: { accounts },
      message: `Found **${accounts.length}** connected social media account(s).`
    };
  })
  .build();
