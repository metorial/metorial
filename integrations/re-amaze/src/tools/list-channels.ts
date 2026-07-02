import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

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
      channels: z
        .array(
          z.object({
            name: z.string().describe('Channel display name'),
            slug: z.string().describe('Channel slug identifier'),
            email: z.string().nullable().optional().describe('Associated email address'),
            channelTypeCode: z
              .number()
              .describe('Numeric channel type (1=Email, 2=Twitter, 3=Facebook, 6=Chat, etc.)'),
            visibility: z.number().describe('0=Private, 1=Public'),
            verified: z.boolean().optional().describe('Whether the channel is verified'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
          })
        )
        .describe('List of channels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listChannels(ctx.input.channelType);

    let channels = (result.channels || []).map((ch: any) => ({
      name: ch.name,
      slug: ch.slug,
      email: ch.email,
      channelTypeCode: ch.channel,
      visibility: ch.visibility,
      verified: ch.verified,
      createdAt: ch.created_at
    }));

    return {
      output: {
        totalCount: result.total_count,
        channels
      },
      message: `Found **${result.total_count}** channels.`
    };
  })
  .build();
