import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { spec } from '../spec';

export let getChannels = SlateTool.create(spec, {
  name: 'Get Channels and Message Types',
  key: 'get_channels',
  description: `Retrieves all messaging channels and message types configured in the Iterable project. Channels represent communication pathways (email, push, SMS, etc.) and message types control how subscription preferences are organized.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      include: z
        .enum(['channels', 'messageTypes', 'both'])
        .default('both')
        .describe('What to retrieve')
    })
  )
  .output(
    z.object({
      channels: z
        .array(
          z.object({
            channelId: z.number().describe('Channel ID'),
            name: z.string().optional().describe('Channel name'),
            channelType: z
              .string()
              .optional()
              .describe('Channel type (e.g. Email, Push, SMS)'),
            messageMedium: z.string().optional().describe('Messaging medium')
          })
        )
        .optional()
        .describe('Messaging channels'),
      messageTypes: z
        .array(
          z.object({
            messageTypeId: z.number().describe('Message type ID'),
            name: z.string().optional().describe('Message type name'),
            channelId: z.number().optional().describe('Associated channel ID'),
            subscriptionPolicy: z.string().optional().describe('Subscription policy')
          })
        )
        .optional()
        .describe('Message types'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    let channels: any[] | undefined;
    let messageTypes: any[] | undefined;

    if (ctx.input.include === 'channels' || ctx.input.include === 'both') {
      let result = await client.getChannels();
      channels = (result.channels || []).map((c: any) => ({
        channelId: c.id,
        name: c.name,
        channelType: c.channelType,
        messageMedium: c.messageMedium
      }));
    }

    if (ctx.input.include === 'messageTypes' || ctx.input.include === 'both') {
      let result = await client.getMessageTypes();
      messageTypes = (result.messageTypes || []).map((mt: any) => ({
        messageTypeId: mt.id,
        name: mt.name,
        channelId: mt.channelId,
        subscriptionPolicy: mt.subscriptionPolicy
      }));
    }

    let parts: string[] = [];
    if (channels) parts.push(`${channels.length} channel(s)`);
    if (messageTypes) parts.push(`${messageTypes.length} message type(s)`);

    return {
      output: {
        channels,
        messageTypes,
        message: `Retrieved ${parts.join(' and ')}.`
      },
      message: `Retrieved ${parts.join(' and ')}.`
    };
  })
  .build();
