import { z } from 'zod';

// Loose so newer provider fields survive in raw: https://core.telegram.org/bots/api#available-types

export let telegramUserSchema = z
  .object({
    id: z.number().int(),
    is_bot: z.boolean().optional(),
    first_name: z.string(),
    last_name: z.string().optional(),
    username: z.string().optional()
  })
  .loose();

export let telegramChatSchema = z
  .object({
    id: z.number().int(),
    type: z.enum(['private', 'group', 'supergroup', 'channel']),
    title: z.string().optional(),
    username: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    is_forum: z.boolean().optional()
  })
  .loose();

export let telegramEntitySchema = z
  .object({
    type: z.string(),
    offset: z.number().int().nonnegative(),
    length: z.number().int().nonnegative(),
    user: telegramUserSchema.optional()
  })
  .loose();

let fileFields = {
  file_id: z.string(),
  file_unique_id: z.string().optional(),
  file_size: z.number().optional()
};

export let telegramPhotoSizeSchema = z
  .object({ ...fileFields, width: z.number(), height: z.number() })
  .loose();

export let telegramFileObjectSchema = z
  .object({
    ...fileFields,
    file_name: z.string().optional(),
    mime_type: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
    title: z.string().optional()
  })
  .loose();

export type TelegramUser = z.infer<typeof telegramUserSchema>;
export type TelegramChat = z.infer<typeof telegramChatSchema>;
export type TelegramEntity = z.infer<typeof telegramEntitySchema>;
export type TelegramFileObject = z.infer<typeof telegramFileObjectSchema>;
export type TelegramPhotoSize = z.infer<typeof telegramPhotoSizeSchema>;

export type TelegramMessage = {
  message_id: number;
  message_thread_id?: number;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  date: number;
  chat: TelegramChat;
  edit_date?: number;
  media_group_id?: string;
  is_topic_message?: boolean;
  text?: string;
  entities?: TelegramEntity[];
  caption?: string;
  caption_entities?: TelegramEntity[];
  photo?: TelegramPhotoSize[];
  document?: TelegramFileObject;
  video?: TelegramFileObject;
  animation?: TelegramFileObject;
  video_note?: TelegramFileObject;
  audio?: TelegramFileObject;
  voice?: TelegramFileObject;
  sticker?: TelegramFileObject;
  reply_to_message?: TelegramMessage;
  [key: string]: unknown;
};

export let telegramMessageSchema: z.ZodType<TelegramMessage> = z.lazy(() =>
  z
    .object({
      message_id: z.number().int(),
      message_thread_id: z.number().int().optional(),
      from: telegramUserSchema.optional(),
      sender_chat: telegramChatSchema.optional(),
      date: z.number().int(),
      chat: telegramChatSchema,
      edit_date: z.number().int().optional(),
      media_group_id: z.string().optional(),
      is_topic_message: z.boolean().optional(),
      text: z.string().optional(),
      entities: z.array(telegramEntitySchema).optional(),
      caption: z.string().optional(),
      caption_entities: z.array(telegramEntitySchema).optional(),
      photo: z.array(telegramPhotoSizeSchema).optional(),
      document: telegramFileObjectSchema.optional(),
      video: telegramFileObjectSchema.optional(),
      animation: telegramFileObjectSchema.optional(),
      video_note: telegramFileObjectSchema.optional(),
      audio: telegramFileObjectSchema.optional(),
      voice: telegramFileObjectSchema.optional(),
      sticker: telegramFileObjectSchema.optional(),
      reply_to_message: telegramMessageSchema.optional()
    })
    .loose()
);

export let telegramReactionTypeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('emoji'), emoji: z.string() }).loose(),
  z.object({ type: z.literal('custom_emoji'), custom_emoji_id: z.string() }).loose(),
  z.object({ type: z.literal('paid') }).loose()
]);

export type TelegramReactionType = z.infer<typeof telegramReactionTypeSchema>;

// https://core.telegram.org/bots/api#messagereactionupdated
export let telegramMessageReactionSchema = z
  .object({
    chat: telegramChatSchema,
    message_id: z.number().int(),
    user: telegramUserSchema.optional(),
    actor_chat: telegramChatSchema.optional(),
    date: z.number().int(),
    old_reaction: z.array(telegramReactionTypeSchema),
    new_reaction: z.array(telegramReactionTypeSchema)
  })
  .loose();

// https://core.telegram.org/bots/api#chatmember
export let telegramChatMemberSchema = z
  .object({
    status: z.enum(['creator', 'administrator', 'member', 'restricted', 'left', 'kicked']),
    user: telegramUserSchema,
    is_member: z.boolean().optional()
  })
  .loose();

// https://core.telegram.org/bots/api#chatmemberupdated
export let telegramChatMemberUpdatedSchema = z
  .object({
    chat: telegramChatSchema,
    from: telegramUserSchema,
    date: z.number().int(),
    old_chat_member: telegramChatMemberSchema,
    new_chat_member: telegramChatMemberSchema
  })
  .loose();

export let telegramMessageUpdateKinds = [
  'message',
  'edited_message',
  'channel_post',
  'edited_channel_post'
] as const;

export let telegramAllowedUpdates = [
  ...telegramMessageUpdateKinds,
  'message_reaction',
  'chat_member',
  'my_chat_member'
] as const;

export type TelegramUpdateKind = (typeof telegramAllowedUpdates)[number];

export let telegramUpdateEnvelopeSchema = z
  .object({
    update_id: z.number().int().nonnegative()
  })
  .loose();

// Reaction updates are split per reaction; membership updates carry their transition.
export let telegramEventSchema = z.object({
  bot: z.object({
    id: z.string(),
    username: z.string().optional()
  }),
  kind: z.enum(telegramAllowedUpdates),
  updateId: z.number().int().nonnegative(),
  update: z.record(z.string(), z.unknown()),
  reaction: z
    .object({
      change: z.enum(['added', 'removed']),
      type: telegramReactionTypeSchema
    })
    .optional(),
  membership: z.enum(['joined', 'left']).optional()
});

export type TelegramEvent = z.infer<typeof telegramEventSchema>;
