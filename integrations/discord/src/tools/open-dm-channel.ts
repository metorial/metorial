import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

// https://docs.discord.com/developers/resources/user#create-dm
export let openDmChannel = SlateTool.create(spec, {
  name: 'Open DM Channel',
  key: 'open_dm_channel',
  description:
    'Open (or reuse) the direct message channel between the bot and a Discord user. Returns the channel ID to use with Send Message and Manage Messages.',
  instructions: [
    'Requires the Bot Token connection. The user must share a server with the bot and allow direct messages from server members.',
    'Opening many DM channels quickly can get the bot rate limited; do not use this to message every member of a server.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(discordActionScopes.openDmChannel)
  .input(
    z.object({
      userId: z
        .string()
        .describe('ID of the user to message. Use Manage Members to find user IDs.')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('ID of the DM channel; pass it as channelId to send'),
      recipientId: z.string().describe('User ID of the DM recipient'),
      recipientUsername: z.string().nullable().describe('Username of the DM recipient')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
    let channel = await client.createDm(ctx.input.userId);
    let recipient = channel.recipients?.[0];

    return {
      output: {
        channelId: channel.id,
        recipientId: recipient?.id ?? ctx.input.userId,
        recipientUsername: recipient?.username ?? null
      },
      message: `Opened DM channel \`${channel.id}\` with user \`${ctx.input.userId}\`.`
    };
  })
  .build();
