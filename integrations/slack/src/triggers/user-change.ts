import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';
import { slackEventsTriggerGroup } from './eventsTriggerGroup';

let slackUserChangeEvent = z
  .object({
    type: z.literal('user_change'),
    event_ts: z.string().optional(),
    user: z
      .object({
        id: z.string(),
        name: z.string().optional(),
        real_name: z.string().optional(),
        is_admin: z.boolean().optional(),
        is_bot: z.boolean().optional(),
        deleted: z.boolean().optional(),
        updated: z.number().optional(),
        profile: z
          .object({
            email: z.string().optional(),
            display_name: z.string().optional(),
            title: z.string().optional(),
            status_text: z.string().optional(),
            status_emoji: z.string().optional(),
            image_192: z.string().optional()
          })
          .loose()
          .optional()
      })
      .loose()
  })
  .loose();

export let userChange = SlateTrigger.create(spec, {
  name: 'User Change',
  key: 'user_change',
  description: "Triggers when a user's profile, status, or account state changes."
})
  .scopes(slackActionScopes.userChange)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackUserChangeEvent)
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      name: z.string().optional().describe('Username'),
      realName: z.string().optional().describe('Full name'),
      displayName: z.string().optional().describe('Display name'),
      email: z.string().optional().describe('Email address'),
      title: z.string().optional().describe('Job title'),
      statusText: z.string().optional().describe('Custom status text'),
      statusEmoji: z.string().optional().describe('Custom status emoji'),
      isAdmin: z.boolean().optional().describe('Whether the user is an admin'),
      isBot: z.boolean().optional().describe('Whether this is a bot user'),
      deleted: z.boolean().optional().describe('Whether the user is deactivated'),
      avatarUrl: z.string().optional().describe('User avatar URL')
    })
  )
  .matches(payload => (payload as { type?: unknown }).type === 'user_change')
  .map(async ctx => {
    let user = ctx.input.user;

    return {
      type: 'user.changed',
      id: `user-change-${user.id}-${user.updated ?? ctx.input.event_ts ?? Date.now()}`,
      output: {
        userId: user.id,
        name: user.name,
        realName: user.real_name,
        displayName: user.profile?.display_name,
        email: user.profile?.email,
        title: user.profile?.title,
        statusText: user.profile?.status_text,
        statusEmoji: user.profile?.status_emoji,
        isAdmin: user.is_admin,
        isBot: user.is_bot,
        deleted: user.deleted,
        avatarUrl: user.profile?.image_192
      }
    };
  })
  .build();
