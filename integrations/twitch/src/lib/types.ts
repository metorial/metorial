export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  email?: string;
  created_at: string;
}

export interface TwitchChannel {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  broadcaster_language: string;
  game_id: string;
  game_name: string;
  title: string;
  delay: number;
  tags: string[];
  content_classification_labels: string[];
  is_branded_content: boolean;
}

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  tags: string[];
  is_mature: boolean;
}

export interface TwitchSubscription {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  gifter_id?: string;
  gifter_login?: string;
  gifter_name?: string;
  is_gift: boolean;
  plan_name: string;
  tier: string;
  user_id: string;
  user_name: string;
  user_login: string;
}

export interface TwitchFollower {
  user_id: string;
  user_login: string;
  user_name: string;
  followed_at: string;
}

export interface TwitchClip {
  id: string;
  url: string;
  embed_url: string;
  broadcaster_id: string;
  broadcaster_name: string;
  creator_id: string;
  creator_name: string;
  video_id: string;
  game_id: string;
  language: string;
  title: string;
  view_count: number;
  created_at: string;
  thumbnail_url: string;
  duration: number;
  vod_offset: number | null;
}

export interface TwitchVideo {
  id: string;
  stream_id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  title: string;
  description: string;
  created_at: string;
  published_at: string;
  url: string;
  thumbnail_url: string;
  viewable: string;
  view_count: number;
  language: string;
  type: string;
  duration: string;
  muted_segments: Array<{ duration: number; offset: number }> | null;
}

export interface TwitchCustomReward {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  id: string;
  title: string;
  prompt: string;
  cost: number;
  image: { url_1x: string; url_2x: string; url_4x: string } | null;
  default_image: { url_1x: string; url_2x: string; url_4x: string };
  background_color: string;
  is_enabled: boolean;
  is_user_input_required: boolean;
  max_per_stream_setting: { is_enabled: boolean; max_per_stream: number };
  max_per_user_per_stream_setting: { is_enabled: boolean; max_per_user_per_stream: number };
  global_cooldown_setting: { is_enabled: boolean; global_cooldown_seconds: number };
  is_paused: boolean;
  is_in_stock: boolean;
  should_redemptions_skip_request_queue: boolean;
  redemptions_redeemed_current_stream: number | null;
  cooldown_expires_at: string | null;
}

export interface TwitchRedemption {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  user_input: string;
  status: string;
  redeemed_at: string;
  reward: {
    id: string;
    title: string;
    prompt: string;
    cost: number;
  };
}

export interface TwitchPoll {
  id: string;
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  title: string;
  choices: Array<{
    id: string;
    title: string;
    votes: number;
    channel_points_votes: number;
    bits_votes: number;
  }>;
  bits_voting_enabled: boolean;
  bits_per_vote: number;
  channel_points_voting_enabled: boolean;
  channel_points_per_vote: number;
  status: string;
  duration: number;
  started_at: string;
  ended_at?: string;
}

export interface TwitchPrediction {
  id: string;
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  title: string;
  winning_outcome_id: string | null;
  outcomes: Array<{
    id: string;
    title: string;
    users: number;
    channel_points: number;
    top_predictors: Array<{
      user_id: string;
      user_login: string;
      user_name: string;
      channel_points_used: number;
      channel_points_won: number;
    }> | null;
    color: string;
  }>;
  prediction_window: number;
  status: string;
  created_at: string;
  ended_at?: string;
  locked_at?: string;
}

export interface TwitchBannedUser {
  user_id: string;
  user_login: string;
  user_name: string;
  expires_at: string;
  created_at: string;
  reason: string;
  moderator_id: string;
  moderator_login: string;
  moderator_name: string;
}

export interface TwitchScheduleSegment {
  id: string;
  start_time: string;
  end_time: string;
  title: string;
  canceled_until: string | null;
  category: { id: string; name: string } | null;
  is_recurring: boolean;
}

export interface TwitchSchedule {
  segments: TwitchScheduleSegment[];
  broadcaster_id: string;
  broadcaster_name: string;
  broadcaster_login: string;
  vacation: { start_time: string; end_time: string } | null;
}

export interface TwitchChatSettings {
  broadcaster_id: string;
  emote_mode: boolean;
  follower_mode: boolean;
  follower_mode_duration: number | null;
  slow_mode: boolean;
  slow_mode_wait_time: number | null;
  subscriber_mode: boolean;
  unique_chat_mode: boolean;
  non_moderator_chat_delay: boolean;
  non_moderator_chat_delay_duration: number | null;
}

export interface TwitchPagination {
  cursor?: string;
}

export interface TwitchResponse<T> {
  data: T[];
  pagination?: TwitchPagination;
  total?: number;
}

export interface TwitchCharityCampaign {
  id: string;
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  charity_name: string;
  charity_description: string;
  charity_logo: string;
  charity_website: string;
  current_amount: { value: number; decimal_places: number; currency: string };
  target_amount: { value: number; decimal_places: number; currency: string };
}

export interface TwitchGoal {
  id: string;
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  type: string;
  description: string;
  current_amount: number;
  target_amount: number;
  created_at: string;
}
