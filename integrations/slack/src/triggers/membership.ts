import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';
import { slackEventsTriggerGroup } from './eventsTriggerGroup';

let slackChannelMembershipEvent = z
  .object({
    type: z.union([z.literal('member_joined_channel'), z.literal('member_left_channel')]),
    user: z.string(),
    channel: z.string(),
    channel_type: z.string().optional(),
    team: z.string().optional(),
    inviter: z.string().optional(),
    event_ts: z.string().optional()
  })
  .loose();

let slackTeamJoinEvent = z
  .object({
    type: z.literal('team_join'),
    event_ts: z.string().optional(),
    user: z
      .object({
        id: z.string(),
        team_id: z.string().optional(),
        name: z.string().optional(),
        real_name: z.string().optional(),
        is_bot: z.boolean().optional(),
        deleted: z.boolean().optional(),
        profile: z
          .object({
            email: z.string().optional(),
            display_name: z.string().optional(),
            image_192: z.string().optional(),
            title: z.string().optional()
          })
          .loose()
          .optional()
      })
      .loose()
  })
  .loose();

export let memberJoinedChannel = SlateTrigger.create(spec, {
  name: 'Member Joined Channel',
  key: 'member_joined_channel',
  description: 'Triggers when a user joins a channel the connected app can see.'
})
  .scopes(slackActionScopes.membershipEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackChannelMembershipEvent)
  .output(
    z.object({
      userId: z.string().describe('User ID who joined'),
      channelId: z.string().describe('Channel ID'),
      channelType: z.string().optional().describe('Conversation type (C, G, etc.)'),
      inviterId: z.string().optional().describe('User ID who invited the joining user, if any')
    })
  )
  .matches(payload => (payload as { type?: unknown }).type === 'member_joined_channel')
  .map(async ctx => {
    let event = ctx.input;
    return {
      type: 'member.joined_channel',
      id: `member-joined-${event.channel}-${event.user}-${event.event_ts ?? Date.now()}`,
      output: {
        userId: event.user,
        channelId: event.channel,
        channelType: event.channel_type,
        inviterId: event.inviter
      }
    };
  })
  .build();

export let memberLeftChannel = SlateTrigger.create(spec, {
  name: 'Member Left Channel',
  key: 'member_left_channel',
  description: 'Triggers when a user leaves a channel the connected app can see.'
})
  .scopes(slackActionScopes.membershipEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackChannelMembershipEvent)
  .output(
    z.object({
      userId: z.string().describe('User ID who left'),
      channelId: z.string().describe('Channel ID'),
      channelType: z.string().optional().describe('Conversation type (C, G, etc.)')
    })
  )
  .matches(payload => (payload as { type?: unknown }).type === 'member_left_channel')
  .map(async ctx => {
    let event = ctx.input;
    return {
      type: 'member.left_channel',
      id: `member-left-${event.channel}-${event.user}-${event.event_ts ?? Date.now()}`,
      output: {
        userId: event.user,
        channelId: event.channel,
        channelType: event.channel_type
      }
    };
  })
  .build();

export let teamJoin = SlateTrigger.create(spec, {
  name: 'New Team Member',
  key: 'team_join',
  description: 'Triggers when a new member joins the workspace.'
})
  .scopes(slackActionScopes.userChange)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackTeamJoinEvent)
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      name: z.string().optional().describe('Username'),
      realName: z.string().optional().describe('Real name'),
      displayName: z.string().optional().describe('Display name'),
      email: z.string().optional().describe('Email address'),
      title: z.string().optional().describe('Job title'),
      isBot: z.boolean().optional().describe('Whether this is a bot user'),
      avatarUrl: z.string().optional().describe('User avatar URL')
    })
  )
  .matches(payload => (payload as { type?: unknown }).type === 'team_join')
  .map(async ctx => {
    let user = ctx.input.user;

    return {
      type: 'user.joined_team',
      id: `team-join-${user.id}-${ctx.input.event_ts ?? Date.now()}`,
      output: {
        userId: user.id,
        name: user.name,
        realName: user.real_name,
        displayName: user.profile?.display_name,
        email: user.profile?.email,
        title: user.profile?.title,
        isBot: user.is_bot,
        avatarUrl: user.profile?.image_192
      }
    };
  })
  .build();
