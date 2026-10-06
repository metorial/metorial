import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Twitch tool schemas', provider.actions);
const legacy = {
  manage_polls: {
    input: [
      'broadcasterId',
      'action',
      'title',
      'choices',
      'durationSeconds',
      'channelPointsVotingEnabled',
      'channelPointsPerVote',
      'pollId',
      'endStatus',
      'maxResults',
      'cursor'
    ],
    output: ['poll', 'polls', 'cursor']
  },
  get_user_info: {
    input: ['userIds', 'logins'],
    output: ['users']
  },
  manage_channel_points: {
    input: [
      'broadcasterId',
      'action',
      'rewardId',
      'title',
      'cost',
      'prompt',
      'isEnabled',
      'backgroundColor',
      'isUserInputRequired',
      'isPaused',
      'maxPerStream',
      'maxPerUserPerStream',
      'globalCooldownSeconds',
      'skipRedemptionQueue',
      'redemptionIds',
      'redemptionStatus',
      'redemptionFilter',
      'maxResults',
      'cursor'
    ],
    output: ['reward', 'rewards', 'redemptions', 'cursor', 'deleted']
  },
  get_channel_info: {
    input: ['broadcasterIds'],
    output: ['channels']
  },
  manage_predictions: {
    input: [
      'broadcasterId',
      'action',
      'title',
      'outcomes',
      'predictionWindowSeconds',
      'predictionId',
      'endStatus',
      'winningOutcomeId',
      'maxResults',
      'cursor'
    ],
    output: ['prediction', 'predictions', 'cursor']
  },
  send_chat_message: {
    input: [
      'broadcasterId',
      'message',
      'replyToMessageId',
      'isAnnouncement',
      'announcementColor'
    ],
    output: ['messageId', 'sent']
  },
  manage_moderation: {
    input: [
      'broadcasterId',
      'action',
      'targetUserId',
      'durationSeconds',
      'reason',
      'messageId'
    ],
    output: ['success', 'action']
  },
  search: {
    input: ['query', 'type', 'liveOnly', 'maxResults', 'cursor'],
    output: ['channels', 'categories', 'cursor']
  },
  get_streams: {
    input: ['userIds', 'userLogins', 'gameIds', 'language', 'maxResults', 'cursor'],
    output: ['streams', 'cursor']
  },
  start_commercial: {
    input: ['broadcasterId', 'lengthSeconds'],
    output: ['lengthSeconds', 'message', 'retryAfterSeconds']
  },
  update_channel: {
    input: [
      'broadcasterId',
      'title',
      'gameId',
      'language',
      'delay',
      'tags',
      'isBrandedContent'
    ],
    output: ['broadcasterId', 'updated']
  },
  manage_chat_settings: {
    input: [
      'broadcasterId',
      'action',
      'emoteMode',
      'followerMode',
      'followerModeDurationMinutes',
      'slowMode',
      'slowModeWaitTimeSeconds',
      'subscriberMode',
      'uniqueChatMode'
    ],
    output: [
      'emoteMode',
      'followerMode',
      'followerModeDurationMinutes',
      'slowMode',
      'slowModeWaitTimeSeconds',
      'subscriberMode',
      'uniqueChatMode'
    ]
  },
  manage_raids: {
    input: ['fromBroadcasterId', 'action', 'toBroadcasterId'],
    output: ['success', 'createdAt', 'isMature']
  },
  get_followers_subscribers: {
    input: ['broadcasterId', 'type', 'checkUserId', 'maxResults', 'cursor'],
    output: ['total', 'followers', 'subscribers', 'cursor']
  },
  get_videos: {
    input: ['videoIds', 'userId', 'gameId', 'type', 'sort', 'period', 'maxResults', 'cursor'],
    output: ['videos', 'cursor']
  },
  send_shoutout: {
    input: ['fromBroadcasterId', 'toBroadcasterId'],
    output: ['success']
  },
  manage_roles: {
    input: ['broadcasterId', 'role', 'action', 'userId', 'maxResults', 'cursor'],
    output: ['users', 'success', 'cursor']
  },
  manage_clips: {
    input: [
      'action',
      'broadcasterId',
      'gameId',
      'clipIds',
      'hasDelay',
      'maxResults',
      'startedAt',
      'endedAt',
      'cursor'
    ],
    output: ['clipId', 'editUrl', 'clips', 'cursor']
  }
};
describe('Historical field and tool contracts', () => {
  for (const [key, fields] of Object.entries(legacy))
    it(`${key} preserves historical fields`, () => {
      const tool = provider.actions.find(tool => tool.key === key);
      expect(tool).toBeDefined();
      for (const name of fields.input)
        expect(z.toJSONSchema(tool!.inputSchema).properties).toHaveProperty(name);
      for (const name of fields.output)
        expect(z.toJSONSchema(tool!.outputSchema).properties).toHaveProperty(name);
    });
  it('has exactly 19 public tools and bounded IDs without triggers', () => {
    expect(provider.actions).toHaveLength(19);
    expect(
      provider.actions.every(tool => tool.type === 'tool' && `twitch-${tool.key}`.length < 60)
    ).toBe(true);
    expect(provider.actions.map(tool => tool.key)).toContain('download_clip');
  });
});
