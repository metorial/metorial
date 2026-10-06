import { z } from 'zod';
import { requireValue, safeJson } from './contracts';

const text = z.string(),
  id = text.min(1),
  count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  flag = z.boolean();
const row = <T extends z.ZodRawShape>(shape: T) => z.object(shape).passthrough();
export const user = row({
  id,
  login: id,
  display_name: text,
  type: text,
  broadcaster_type: text,
  description: text,
  profile_image_url: text,
  offline_image_url: text,
  created_at: text,
  email: text.optional()
});
const channel = row({
  broadcaster_id: id,
  broadcaster_login: text,
  broadcaster_name: text,
  broadcaster_language: text,
  game_id: text,
  game_name: text,
  title: text,
  delay: count,
  tags: z.array(text),
  content_classification_labels: z.array(text),
  is_branded_content: flag
});
const stream = row({
  id,
  user_id: id,
  user_login: text,
  user_name: text,
  game_id: text,
  game_name: text,
  type: text,
  title: text,
  viewer_count: count,
  started_at: text,
  language: text,
  thumbnail_url: text,
  tags: z.array(text),
  is_mature: flag
});
const clip = row({
  id,
  url: text,
  embed_url: text,
  broadcaster_id: id,
  broadcaster_name: text,
  creator_id: id,
  creator_name: text,
  game_id: text,
  title: text,
  view_count: count,
  created_at: text,
  thumbnail_url: text,
  duration: z.number().nonnegative(),
  video_id: text
});
const video = row({
  id,
  stream_id: text,
  user_id: id,
  user_login: text,
  user_name: text,
  title: text,
  description: text,
  url: text,
  thumbnail_url: text,
  view_count: count,
  language: text,
  type: text,
  duration: text,
  created_at: text,
  published_at: text
});
const subscription = row({
  user_id: id,
  user_login: text,
  user_name: text,
  tier: text,
  plan_name: text,
  is_gift: flag,
  gifter_id: text.optional(),
  gifter_name: text.optional()
});
const follower = row({ user_id: id, user_login: text, user_name: text, followed_at: text });
const settings = row({
  broadcaster_id: id,
  emote_mode: flag,
  follower_mode: flag,
  follower_mode_duration: count.nullable(),
  slow_mode: flag,
  slow_mode_wait_time: count.nullable(),
  subscriber_mode: flag,
  unique_chat_mode: flag
});
const reward = row({
  id,
  broadcaster_id: id,
  title: text,
  cost: count.min(1),
  is_enabled: flag,
  is_paused: flag,
  prompt: text,
  background_color: text
});
const redemption = row({
  id,
  broadcaster_id: id,
  user_id: id,
  user_name: text,
  user_input: text,
  status: text,
  redeemed_at: text,
  reward: row({ id, title: text, cost: count })
});
const choice = row({ id, title: text, votes: count, channel_points_votes: count });
const poll = row({
  id,
  broadcaster_id: id,
  title: text,
  choices: z.array(choice),
  status: text,
  duration: count,
  started_at: text,
  ended_at: text.nullable().optional()
});
const outcome = row({ id, title: text, users: count, channel_points: count, color: text });
const prediction = row({
  id,
  broadcaster_id: id,
  title: text,
  outcomes: z.array(outcome),
  status: text,
  prediction_window: count,
  created_at: text,
  winning_outcome_id: text.nullable(),
  ended_at: text.nullable().optional(),
  locked_at: text.nullable().optional()
});
const role = row({ user_id: id, user_login: text, user_name: text });
const shield = row({
  is_active: flag,
  moderator_id: text,
  moderator_name: text,
  moderator_login: text,
  last_activated_at: text
});
const searchChannel = row({
  id,
  broadcaster_login: text,
  display_name: text,
  game_id: text,
  game_name: text,
  is_live: flag,
  title: text,
  broadcaster_language: text,
  thumbnail_url: text,
  tags: z.array(text)
});
const category = row({ id, name: text, box_art_url: text });
const chatReceipt = row({
  message_id: text,
  is_sent: flag,
  drop_reason: row({ code: text, message: text }).nullable().optional()
});
export function validateResponse(
  path: string,
  method: string,
  status: number,
  data: unknown,
  secrets: readonly string[]
) {
  const url = new URL(path, 'https://api.twitch.tv/helix/'),
    route = url.pathname;
  const noContent =
    (method === 'patch' && route === '/channels') ||
    route === '/chat/announcements' ||
    route === '/chat/shoutouts' ||
    route === '/moderation/chat' ||
    (method !== 'get' && ['/moderation/moderators', '/channels/vips'].includes(route)) ||
    (method === 'delete' &&
      ['/moderation/bans', '/channel_points/custom_rewards', '/raids'].includes(route));
  const expected = noContent ? 204 : method === 'post' && route === '/clips' ? 202 : 200;
  requireValue(
    status === expected,
    `Twitch returned an unexpected status. Expected HTTP ${expected}; reconcile uncertain writes before retrying.`
  );
  if (noContent) {
    requireValue(
      data === '' || data === undefined || data === null,
      'Twitch returned an unexpected body for an empty receipt.'
    );
    return;
  }
  safeJson(data, secrets);
  const schemas: Record<string, z.ZodType> = {
    '/users': user,
    '/channels': channel,
    '/streams': stream,
    '/subscriptions': subscription,
    '/channels/followers': follower,
    '/clips': method === 'post' ? row({ id, edit_url: text }) : clip,
    '/videos': video,
    '/chat/settings': settings,
    '/chat/messages': chatReceipt,
    '/channel_points/custom_rewards': reward,
    '/channel_points/custom_rewards/redemptions': redemption,
    '/polls': poll,
    '/predictions': prediction,
    '/moderation/moderators': role,
    '/channels/vips': role,
    '/moderation/shield_mode': shield,
    '/search/channels': searchChannel,
    '/search/categories': category,
    '/raids': row({ created_at: text, is_mature: flag }),
    '/channels/commercial': row({ length: count, message: text, retry_after: count }),
    '/moderation/bans':
      method === 'post'
        ? row({
            broadcaster_id: id,
            user_id: id,
            moderator_id: id,
            created_at: text,
            end_time: text.nullable()
          })
        : row({ user_id: id, reason: text, expires_at: text }),
    '/clips/downloads': row({
      clip_id: id,
      landscape_download_url: text.nullable(),
      portrait_download_url: text.nullable()
    })
  };
  const schema = schemas[route];
  if (schema) {
    const result = row({
      data: z.array(schema),
      pagination: row({ cursor: text.optional() }).optional(),
      total: count.optional()
    }).safeParse(data);
    requireValue(result.success, 'Twitch returned a malformed native receipt or collection.');
  }
  if (method !== 'get') {
    const body = data as { data?: unknown[] };
    requireValue(
      body.data?.length === 1 || route.endsWith('/redemptions'),
      'Twitch did not return the expected single native receipt.'
    );
  }
  if (route === '/subscriptions' || route === '/channels/followers')
    requireValue(
      row({ total: count }).safeParse(data).success,
      'Twitch did not return its native total count.'
    );
}
export { z };
