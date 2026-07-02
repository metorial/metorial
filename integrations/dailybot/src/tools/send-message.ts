import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to users, teams, or channels via the connected chat platform (Slack, MS Teams, Google Chat, or Discord). Can include text, images, and interactive buttons. At least one target (users, teams, or channels) must be provided.`,
  instructions: [
    'Provide at least one of targetUserUuids, targetTeamUuids, or targetChannels.',
    'Buttons are optional and each button requires a label and value.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      message: z.string().describe('Message text content to send'),
      targetUserUuids: z
        .array(z.string())
        .optional()
        .describe('UUIDs of users to receive the message'),
      targetTeamUuids: z
        .array(z.string())
        .optional()
        .describe('UUIDs of teams whose members will receive the message'),
      targetChannels: z
        .array(
          z.object({
            channelId: z.string().describe('ID of the channel on the connected chat platform')
          })
        )
        .optional()
        .describe('Channels to send the message to'),
      imageUrl: z.string().optional().describe('URL of an image to include in the message'),
      buttons: z
        .array(
          z.object({
            label: z.string().describe('Button label text'),
            value: z.string().describe('Button value'),
            type: z.string().optional().describe('Button type')
          })
        )
        .optional()
        .describe('Interactive buttons to include in the message')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the message was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let channels = ctx.input.targetChannels?.map(c => ({ id: c.channelId }));

    await client.sendMessage({
      message: ctx.input.message,
      targetUsers: ctx.input.targetUserUuids,
      targetTeams: ctx.input.targetTeamUuids,
      targetChannels: channels,
      imageUrl: ctx.input.imageUrl,
      buttons: ctx.input.buttons
    });

    return {
      output: { sent: true },
      message: `Message sent successfully.`
    };
  })
  .build();
