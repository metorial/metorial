import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrowTerminalClient } from '../lib/client';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List all connected social media accounts. Returns each account's platform, username, connection status, and unique identifier.
Use this to discover available accounts before creating posts.`,
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
            accountId: z.string().describe('Unique identifier of the connected account'),
            platform: z.string().describe('Social media platform (tiktok, x, instagram)'),
            username: z.string().describe('Username on the platform'),
            displayName: z.string().describe('Display name on the platform'),
            connected: z
              .boolean()
              .describe('Whether the account is currently connected and active'),
            createdAt: z.string().describe('When the account was connected')
          })
        )
        .describe('List of connected social media accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrowTerminalClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let accounts = await client.listAccounts();

    return {
      output: {
        accounts: accounts.map(a => ({
          accountId: a.accountId,
          platform: a.platform,
          username: a.username,
          displayName: a.displayName,
          connected: a.connected,
          createdAt: a.createdAt
        }))
      },
      message: `Found **${accounts.length}** connected account(s): ${accounts.map(a => `${a.username} (${a.platform})`).join(', ') || 'none'}.`
    };
  })
  .build();
