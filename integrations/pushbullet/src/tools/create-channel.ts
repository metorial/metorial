import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createChannel = SlateTool.create(spec, {
  name: 'Create Channel',
  key: 'create_channel',
  description:
    'Create a Pushbullet channel for broadcasting pushes to subscribers, optionally publishing updates from an RSS feed.',
  instructions: ['Use the returned channelTag with send_push to broadcast to the channel.'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      channelTag: z.string().describe('Globally unique tag for the new channel'),
      name: z.string().describe('Channel display name'),
      description: z.string().optional().describe('Channel description'),
      imageUrl: z.string().optional().describe('Channel image URL'),
      websiteUrl: z.string().optional().describe('Channel website URL'),
      feedUrl: z
        .string()
        .optional()
        .describe('RSS feed URL whose posts will be published to the channel'),
      subscribe: z
        .boolean()
        .optional()
        .describe('Subscribe the connected account when the channel is created')
    })
  )
  .output(
    z.object({
      channelIden: z.string().describe('Created channel identifier'),
      channelTag: z.string().describe('Created channel tag'),
      channelName: z.string().describe('Channel display name'),
      channelDescription: z.string().optional().describe('Channel description'),
      imageUrl: z.string().optional().describe('Channel image URL'),
      websiteUrl: z.string().optional().describe('Channel website URL'),
      raw: z.unknown().describe('Complete channel response')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.channelTag.trim() || !ctx.input.name.trim()) {
      throw createApiServiceError('Provide a non-empty channelTag and name.');
    }
    let channel = await new Client({ token: ctx.auth.token }).createChannel({
      tag: ctx.input.channelTag,
      name: ctx.input.name,
      description: ctx.input.description,
      imageUrl: ctx.input.imageUrl,
      websiteUrl: ctx.input.websiteUrl,
      feedUrl: ctx.input.feedUrl,
      subscribe: ctx.input.subscribe
    });
    return {
      output: {
        channelIden: channel.iden,
        channelTag: channel.tag,
        channelName: channel.name,
        channelDescription: channel.description,
        imageUrl: channel.image_url,
        websiteUrl: channel.website_url,
        raw: channel
      },
      message: `Created channel **${channel.name}** (#${channel.tag}).`
    };
  })
  .build();
