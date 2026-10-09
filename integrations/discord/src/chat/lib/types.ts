export interface DiscordAuthOutput {
  token: string;
  tokenType?: string;
  botUserId?: string;
  applicationId?: string;
}

export interface DiscordApiUser {
  id: string;
  username?: string;
  global_name?: string | null;
  discriminator?: string;
  avatar?: string | null;
  bot?: boolean;
  system?: boolean;
  member?: DiscordApiMember;
}

export interface DiscordApiMember {
  user?: DiscordApiUser;
  nick?: string | null;
  avatar?: string | null;
}

export interface DiscordApiAttachment {
  id: string;
  filename: string;
  content_type?: string;
  size?: number;
  url?: string;
  proxy_url?: string;
  height?: number | null;
  width?: number | null;
  description?: string;
}

export interface DiscordApiEmoji {
  id?: string | null;
  name?: string | null;
  animated?: boolean;
}

export interface DiscordApiReaction {
  count: number;
  me?: boolean;
  emoji: DiscordApiEmoji;
}

export interface DiscordApiEmbed {
  type?: string;
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  image?: { url?: string };
  thumbnail?: { url?: string };
  provider?: { name?: string };
  author?: { name?: string };
  footer?: { text?: string };
  fields?: { name: string; value: string; inline?: boolean }[];
}

export interface DiscordApiMessage {
  id: string;
  channel_id: string;
  guild_id?: string;
  channel_type?: number;
  author?: DiscordApiUser;
  member?: DiscordApiMember;
  webhook_id?: string;
  application_id?: string;
  content?: string;
  timestamp?: string;
  edited_timestamp?: string | null;
  mentions?: DiscordApiUser[];
  mention_everyone?: boolean;
  attachments?: DiscordApiAttachment[];
  embeds?: DiscordApiEmbed[];
  reactions?: DiscordApiReaction[];
  type?: number;
  flags?: number;
  message_reference?: { message_id?: string; channel_id?: string; guild_id?: string };
  referenced_message?: DiscordApiMessage | null;
  [key: string]: unknown;
}

export interface DiscordApiChannel {
  id: string;
  type: number;
  guild_id?: string;
  name?: string | null;
  topic?: string | null;
  parent_id?: string | null;
  recipients?: DiscordApiUser[];
  permission_overwrites?: { id: string; type: number; allow?: string; deny?: string }[];
  member_count?: number;
  message_count?: number;
  [key: string]: unknown;
}

/** Bot identity used to compute `isMe` and mentions without extra calls. */
export interface DiscordIdentity {
  botUserId?: string;
  applicationId?: string;
}
