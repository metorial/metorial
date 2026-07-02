import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createChannel = SlateTool.create(spec, {
  name: 'Create Channel',
  key: 'create_channel',
  description: `Creates a new channel in your Heartbeat community. Channels can be of type thread, chat, or voice.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the channel'),
      channelType: z
        .enum(['thread', 'chat', 'voice'])
        .optional()
        .describe('Type of channel to create'),
      emoji: z.string().optional().describe('Emoji to represent the channel'),
      isReadOnly: z
        .boolean()
        .optional()
        .describe('Whether the channel is read-only for members')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('ID of the created channel'),
      name: z.string().describe('Name of the created channel'),
      channelType: z.string().describe('Type of the created channel'),
      createdAt: z.string().describe('Timestamp when the channel was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let channel = await client.createChannel({
      name: ctx.input.name,
      channelType: ctx.input.channelType,
      emoji: ctx.input.emoji,
      isReadOnly: ctx.input.isReadOnly
    });

    return {
      output: {
        channelId: channel.id,
        name: channel.name,
        channelType: channel.channelType,
        createdAt: channel.createdAt
      },
      message: `Created ${channel.channelType} channel **${channel.name}**.`
    };
  })
  .build();
