import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createChannel = SlateTool.create(spec, {
  name: 'Create Channel',
  key: 'create_channel',
  description: `Create a new Zulip channel (stream). The authenticated user will be automatically subscribed. Can create public or private channels.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the new channel'),
      description: z.string().optional().describe('Description of the channel'),
      isPrivate: z
        .boolean()
        .optional()
        .describe('Whether the channel should be private (invite-only). Defaults to false'),
      historyPublicToSubscribers: z
        .boolean()
        .optional()
        .describe(
          'Whether history is available to new subscribers. Defaults to true for public channels'
        )
    })
  )
  .output(
    z.object({
      created: z.boolean().describe('Whether the channel was newly created'),
      alreadySubscribed: z
        .array(z.string())
        .optional()
        .describe('Channel names that already existed and were subscribed to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    let result = await client.createChannel({
      name: ctx.input.name,
      description: ctx.input.description,
      isPrivate: ctx.input.isPrivate,
      historyPublicToSubscribers: ctx.input.historyPublicToSubscribers
    });

    let alreadySubscribed = Object.keys(result.already_subscribed || {});
    let created = alreadySubscribed.length === 0;

    return {
      output: {
        created,
        alreadySubscribed: alreadySubscribed.length > 0 ? alreadySubscribed : undefined
      },
      message: created
        ? `Channel "${ctx.input.name}" created successfully`
        : `Already subscribed to channel "${ctx.input.name}"`
    };
  })
  .build();
