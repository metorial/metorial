import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrSubscribeChannel = SlateTool.create(spec, {
  name: 'Create or Subscribe to Channel',
  key: 'create_or_subscribe_channel',
  description:
    'Subscribe to a Zulip channel by name, creating it if it does not exist and permissions allow. Reports actual subscription changes; a new subscription does not prove that the channel was newly created.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Name of the channel to create or join'),
      description: z
        .string()
        .optional()
        .describe('Description used if the channel is newly created'),
      isPrivate: z.boolean().optional().describe('Whether a newly created channel is private'),
      historyPublicToSubscribers: z
        .boolean()
        .optional()
        .describe('Whether new subscribers can access the history of a newly created channel')
    })
  )
  .output(
    z.object({
      subscribed: z
        .record(z.string(), z.array(z.string()))
        .describe(
          'User IDs (emails on older servers) mapped to channel names newly subscribed to'
        ),
      alreadySubscribed: z
        .record(z.string(), z.array(z.string()))
        .describe(
          'User IDs (emails on older servers) mapped to channel names already subscribed to'
        ),
      raw: z.any().describe('Complete provider subscription result')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).createChannel(ctx.input);
    return {
      output: {
        subscribed: result.subscribed,
        alreadySubscribed: result.already_subscribed,
        raw: result
      },
      message: `Processed subscription to channel "${ctx.input.name}"`
    };
  })
  .build();
