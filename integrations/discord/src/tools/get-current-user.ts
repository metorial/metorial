import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

// https://docs.discord.com/developers/resources/user#get-current-user
export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Get the Discord account behind this connection: the bot user for a bot token, or the signed-in user for an OAuth connection.',
  instructions: [
    'Use this to learn the bot or user ID, for example to recognize messages the bot sent or to mention it.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(discordActionScopes.getCurrentUser)
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('User ID of the connected bot or user'),
      username: z.string().describe('Unique username'),
      globalName: z.string().nullable().describe('Display name, if set'),
      isBot: z.boolean().describe('Whether the account is a bot user'),
      avatarUrl: z.string().nullable().describe('Avatar image URL, if the account has one'),
      email: z
        .string()
        .nullable()
        .optional()
        .describe('Email address (OAuth connections with the email scope only)'),
      verified: z
        .boolean()
        .optional()
        .describe(
          'Whether the email is verified (OAuth connections with the email scope only)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
    let user = await client.getCurrentUser();

    return {
      output: {
        userId: user.id,
        username: user.username ?? '',
        globalName: user.global_name ?? null,
        isBot: user.bot === true,
        avatarUrl: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : null,
        email: user.email,
        verified: user.verified
      },
      message: `Connected as ${user.bot ? 'bot' : 'user'} **${user.username}** (\`${user.id}\`).`
    };
  })
  .build();
