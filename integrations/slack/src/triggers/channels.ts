import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';
import { slackEventsTriggerGroup } from './eventsTriggerGroup';

let slackChannelCreatedEvent = z
  .object({
    type: z.literal('channel_created'),
    event_ts: z.string().optional(),
    channel: z
      .object({
        id: z.string(),
        name: z.string().optional(),
        created: z.number().optional(),
        creator: z.string().optional()
      })
      .loose()
  })
  .loose();

let slackChannelRenameEvent = z
  .object({
    type: z.literal('channel_rename'),
    event_ts: z.string().optional(),
    channel: z
      .object({
        id: z.string(),
        name: z.string().optional(),
        created: z.number().optional()
      })
      .loose()
  })
  .loose();

let slackChannelLifecycleEvent = z
  .object({
    type: z.union([z.literal('channel_archive'), z.literal('channel_unarchive')]),
    channel: z.string(),
    user: z.string().optional(),
    event_ts: z.string().optional()
  })
  .loose();

export let channelCreated = SlateTrigger.create(spec, {
  name: 'Channel Created',
  key: 'channel_created',
  description: 'Triggers when a new channel is created in the workspace.'
})
  .scopes(slackActionScopes.channelEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackChannelCreatedEvent)
  .output(
    z.object({
      channelId: z.string().describe('Channel ID'),
      channelName: z.string().optional().describe('Channel name'),
      creatorId: z.string().optional().describe('User ID of the channel creator'),
      created: z.number().optional().describe('Unix timestamp when the channel was created')
    })
  )
  .matches(payload => (payload as { type?: unknown }).type === 'channel_created')
  .map(async ctx => {
    let channel = ctx.input.channel;
    return {
      type: 'channel.created',
      id: `channel-created-${channel.id}`,
      output: {
        channelId: channel.id,
        channelName: channel.name,
        creatorId: channel.creator,
        created: channel.created
      }
    };
  })
  .build();

export let channelRenamed = SlateTrigger.create(spec, {
  name: 'Channel Renamed',
  key: 'channel_renamed',
  description: 'Triggers when a channel is renamed.'
})
  .scopes(slackActionScopes.channelEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackChannelRenameEvent)
  .output(
    z.object({
      channelId: z.string().describe('Channel ID'),
      channelName: z.string().optional().describe('New channel name')
    })
  )
  .matches(payload => (payload as { type?: unknown }).type === 'channel_rename')
  .map(async ctx => {
    let channel = ctx.input.channel;
    return {
      type: 'channel.renamed',
      id: `channel-renamed-${channel.id}-${ctx.input.event_ts ?? Date.now()}`,
      output: {
        channelId: channel.id,
        channelName: channel.name
      }
    };
  })
  .build();

export let channelArchived = SlateTrigger.create(spec, {
  name: 'Channel Archived',
  key: 'channel_archived',
  description: 'Triggers when a channel is archived.'
})
  .scopes(slackActionScopes.channelEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackChannelLifecycleEvent)
  .output(
    z.object({
      channelId: z.string().describe('Channel ID'),
      actorId: z.string().optional().describe('User ID who archived the channel')
    })
  )
  .matches(payload => (payload as { type?: unknown }).type === 'channel_archive')
  .map(async ctx => ({
    type: 'channel.archived',
    id: `channel-archived-${ctx.input.channel}-${ctx.input.event_ts ?? Date.now()}`,
    output: {
      channelId: ctx.input.channel,
      actorId: ctx.input.user
    }
  }))
  .build();

export let channelUnarchived = SlateTrigger.create(spec, {
  name: 'Channel Unarchived',
  key: 'channel_unarchived',
  description: 'Triggers when a channel is unarchived.'
})
  .scopes(slackActionScopes.channelEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackChannelLifecycleEvent)
  .output(
    z.object({
      channelId: z.string().describe('Channel ID'),
      actorId: z.string().optional().describe('User ID who unarchived the channel')
    })
  )
  .matches(payload => (payload as { type?: unknown }).type === 'channel_unarchive')
  .map(async ctx => ({
    type: 'channel.unarchived',
    id: `channel-unarchived-${ctx.input.channel}-${ctx.input.event_ts ?? Date.now()}`,
    output: {
      channelId: ctx.input.channel,
      actorId: ctx.input.user
    }
  }))
  .build();
