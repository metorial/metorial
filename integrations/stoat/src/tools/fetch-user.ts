import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let fetchUser = SlateTool.create(spec, {
  name: 'Fetch User',
  key: 'fetch_user',
  description: `Fetch a Stoat user's profile information including username, display name, status, badges, and profile content. Use "@me" as the user ID to fetch the authenticated user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('User ID to fetch, or "@me" for the authenticated user'),
      includeProfile: z
        .boolean()
        .optional()
        .describe('Also fetch extended profile information (bio, background)')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      username: z.string().describe('Username'),
      discriminator: z.string().describe('User discriminator'),
      displayName: z.string().optional().describe('Display name'),
      badges: z.number().optional().describe('Badge bitfield when provided'),
      flags: z.number().optional().describe('User flags bitfield when provided'),
      online: z.boolean().describe('Whether the user is online'),
      isBot: z.boolean().describe('Whether the user is a bot'),
      statusText: z.string().optional().describe('User status text'),
      statusPresence: z
        .string()
        .optional()
        .describe('User presence (Online, Idle, Focus, Busy, Invisible)'),
      profileContent: z.string().optional().describe('User profile bio')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let userId = ctx.input.userId === '@me' ? '@me' : ctx.input.userId;
    let user = userId === '@me' ? await client.fetchSelf() : await client.fetchUser(userId);

    let profileContent: string | undefined;
    if (ctx.input.includeProfile) {
      let profile = await client.fetchUserProfile(user._id);
      profileContent = profile.content ?? undefined;
    }

    return {
      output: {
        userId: user._id,
        username: user.username,
        discriminator: user.discriminator,
        displayName: user.display_name ?? undefined,
        badges: user.badges ?? undefined,
        flags: user.flags ?? undefined,
        online: user.online,
        isBot: !!user.bot,
        statusText: user.status?.text ?? undefined,
        statusPresence: user.status?.presence ?? undefined,
        profileContent
      },
      message: `Fetched user **${user.display_name ?? user.username}** (\`${user._id}\`)`
    };
  })
  .build();

export let openDM = SlateTool.create(spec, {
  name: 'Open Direct Message',
  key: 'open_dm',
  description: `Open a direct message channel with a user. Returns the DM channel ID which can then be used to send messages.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('User ID to open a DM with')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('ID of the DM channel'),
      channelType: z.string().describe('Type of the channel')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.openDM(ctx.input.userId);

    return {
      output: {
        channelId: result._id,
        channelType: result.channel_type
      },
      message: `Opened DM channel \`${result._id}\` with user \`${ctx.input.userId}\``
    };
  })
  .build();
