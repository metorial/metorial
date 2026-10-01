import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let channelSchema = z.object({
  name: z.string().describe('Channel display name'),
  slug: z.string().describe('Channel slug identifier'),
  email: z.string().nullable().optional().describe('Associated email address'),
  channelTypeCode: z
    .number()
    .describe('Numeric channel type (1=Email, 2=Twitter, 3=Facebook, 6=Chat, etc.)'),
  visibility: z.number().describe('0=Private, 1=Public'),
  verified: z.boolean().optional().describe('Whether the channel is verified'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 last update timestamp'),
  spamFilterEnabled: z.boolean().optional().describe('Whether the spam filter is enabled'),
  replyFromOrigin: z
    .boolean()
    .optional()
    .describe('Whether replies use the original recipient address'),
  verificationEmail: z
    .string()
    .nullable()
    .optional()
    .describe('Email used to verify the channel'),
  lastVerified: z
    .string()
    .nullable()
    .optional()
    .describe('ISO 8601 last verification timestamp'),
  replyFromName: z
    .string()
    .nullable()
    .optional()
    .describe('Reply sender name setting: channel, brand, or staff'),
  signature: z.string().nullable().optional().describe('Configured channel signature'),
  brandName: z.string().optional().describe('Brand display name'),
  brandSubdomain: z.string().optional().describe('Brand subdomain')
});

export let listChannels = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `List all configured support channels for the brand. Optionally filter by channel type (email, facebook, twitter, chat). Useful for finding channel slugs needed when creating conversations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelType: z
        .enum(['email', 'facebook', 'twitter', 'chat'])
        .optional()
        .describe('Filter channels by type')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of channels'),
      channels: z.array(channelSchema).describe('List of channels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listChannels(ctx.input.channelType);

    let channels = (result.channels || []).map(mapChannel);

    return {
      output: {
        totalCount: result.total_count,
        channels
      },
      message: `Found **${result.total_count}** channels.`
    };
  })
  .build();

export let getChannel = SlateTool.create(spec, {
  name: 'Get Channel',
  key: 'get_channel',
  description:
    'Retrieve a support channel by its slug, including its type, sender settings, signature, verification state, and brand. Call list_channels to discover channel slugs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      channelSlug: z
        .string()
        .min(1)
        .describe('Channel slug. Call list_channels to find channel slugs.')
    })
  )
  .output(channelSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });
    let result = await client.getChannel(ctx.input.channelSlug);
    let channel = result;

    return {
      output: mapChannel(channel),
      message: `Retrieved channel **${channel.name}**.`
    };
  })
  .build();

let mapChannel = (channel: any) => ({
  name: channel.name,
  slug: channel.slug,
  email: channel.email,
  channelTypeCode: channel.channel,
  visibility: channel.visibility,
  verified: channel.verified ?? undefined,
  createdAt: channel.created_at ?? undefined,
  updatedAt: channel.updated_at ?? undefined,
  spamFilterEnabled: channel.spam_filter_enabled ?? undefined,
  replyFromOrigin: channel.reply_from_origin ?? undefined,
  verificationEmail: channel.verification_email,
  lastVerified: channel.last_verified,
  replyFromName: channel.settings_reply_from_name,
  signature: channel.settings_signature,
  brandName: channel.brand?.name ?? undefined,
  brandSubdomain: channel.brand?.url ?? undefined
});
