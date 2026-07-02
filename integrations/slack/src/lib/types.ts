// Slack API response types

export interface SlackResponse {
  ok: boolean;
  error?: string;
  response_metadata?: {
    next_cursor?: string;
    scopes?: string[];
  };
}

export interface SlackMessage {
  type?: string;
  subtype?: string;
  ts: string;
  text?: string;
  user?: string;
  bot_id?: string;
  team?: string;
  channel?: string;
  thread_ts?: string;
  reply_count?: number;
  reply_users_count?: number;
  latest_reply?: string;
  blocks?: any[];
  attachments?: any[];
  edited?: { user: string; ts: string };
  reactions?: { name: string; users: string[]; count: number }[];
  files?: SlackFile[];
  pinned_to?: string[];
}

export interface SlackScheduledMessage {
  id?: string;
  scheduled_message_id?: string;
  channel_id?: string;
  post_at?: number;
  date_created?: number;
  text?: string;
}

export interface SlackConversation {
  id: string;
  name?: string;
  is_channel?: boolean;
  is_group?: boolean;
  is_im?: boolean;
  is_mpim?: boolean;
  is_private?: boolean;
  is_archived?: boolean;
  is_general?: boolean;
  is_shared?: boolean;
  is_org_shared?: boolean;
  is_member?: boolean;
  creator?: string;
  name_normalized?: string;
  num_members?: number;
  topic?: { value: string; creator: string; last_set: number };
  purpose?: { value: string; creator: string; last_set: number };
  created?: number;
  updated?: number;
  unlinked?: number;
}

export interface SlackUser {
  id: string;
  team_id?: string;
  name?: string;
  deleted?: boolean;
  real_name?: string;
  tz?: string;
  tz_label?: string;
  tz_offset?: number;
  profile?: SlackUserProfile;
  is_admin?: boolean;
  is_owner?: boolean;
  is_primary_owner?: boolean;
  is_restricted?: boolean;
  is_ultra_restricted?: boolean;
  is_bot?: boolean;
  is_app_user?: boolean;
  updated?: number;
}

export interface SlackUserProfile {
  title?: string;
  phone?: string;
  skype?: string;
  real_name?: string;
  real_name_normalized?: string;
  display_name?: string;
  display_name_normalized?: string;
  status_text?: string;
  status_emoji?: string;
  status_expiration?: number;
  avatar_hash?: string;
  email?: string;
  image_24?: string;
  image_32?: string;
  image_48?: string;
  image_72?: string;
  image_192?: string;
  image_512?: string;
  image_1024?: string;
  image_original?: string;
  first_name?: string;
  last_name?: string;
}

export interface SlackFile {
  id: string;
  created?: number;
  timestamp?: number;
  name?: string;
  title?: string;
  mimetype?: string;
  filetype?: string;
  pretty_type?: string;
  user?: string;
  size?: number;
  mode?: string;
  is_external?: boolean;
  is_public?: boolean;
  url_private?: string;
  url_private_download?: string;
  permalink?: string;
  permalink_public?: string;
  channels?: string[];
  groups?: string[];
  ims?: string[];
  shares?: any;
}

export interface SlackReaction {
  name: string;
  users: string[];
  count: number;
}

export interface SlackPin {
  type: string;
  channel?: string;
  message?: SlackMessage;
  created?: number;
  created_by?: string;
}

export interface SlackUserGroup {
  id: string;
  team_id?: string;
  is_usergroup?: boolean;
  is_subteam?: boolean;
  name?: string;
  description?: string;
  handle?: string;
  is_external?: boolean;
  date_create?: number;
  date_update?: number;
  date_delete?: number;
  auto_type?: string | null;
  auto_provision?: boolean;
  created_by?: string;
  updated_by?: string;
  deleted_by?: string;
  user_count?: number;
  users?: string[];
}

export interface SlackReminder {
  id: string;
  creator?: string;
  user?: string;
  text?: string;
  recurring?: boolean;
  time?: number;
  complete_ts?: number;
}

export interface SlackTeamInfo {
  id: string;
  name?: string;
  domain?: string;
  email_domain?: string;
  icon?: {
    image_34?: string;
    image_44?: string;
    image_68?: string;
    image_88?: string;
    image_102?: string;
    image_132?: string;
    image_230?: string;
    image_original?: string;
  };
  enterprise_id?: string;
  enterprise_name?: string;
}

export interface SlackBookmark {
  id: string;
  channel_id?: string;
  title?: string;
  link?: string;
  emoji?: string;
  icon_url?: string;
  type?: string;
  date_created?: number;
  date_updated?: number;
  rank?: string;
  last_updated_by_user_id?: string;
  shortcut_id?: string;
  entity_id?: string;
}
