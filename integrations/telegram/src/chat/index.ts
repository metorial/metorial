import { ChatAdapter } from '@slates/adapter-chat';
import {
  chatAddReaction,
  chatDeleteMessage,
  chatDownloadFile,
  chatEditMessage,
  chatGetAuthenticatedUser,
  chatGetChannel,
  chatGetSetup,
  chatGetWorkspace,
  chatListCommands,
  chatListWorkspaces,
  chatRemoveReaction,
  chatSendMessage,
  chatStartTyping,
  chatUploadFile
} from './tools';
import {
  chatCommandInvoked,
  chatMemberJoined,
  chatMemberLeft,
  chatMentionReceived,
  chatMessageReceived,
  chatMessageUpdated,
  chatReactionAdded,
  chatReactionRemoved
} from './triggers';

// Omitted: actions the Bot API lacks for bots, and message.deleted (no deletion updates).
export let telegramChatTools = [
  chatSendMessage,
  chatEditMessage,
  chatDeleteMessage,
  chatAddReaction,
  chatRemoveReaction,
  chatGetChannel,
  chatListWorkspaces,
  chatGetWorkspace,
  chatGetAuthenticatedUser,
  chatUploadFile,
  chatDownloadFile,
  chatListCommands,
  chatStartTyping,
  chatGetSetup
];

export let telegramChatTriggers = [
  chatMessageReceived,
  chatMessageUpdated,
  chatMentionReceived,
  chatReactionAdded,
  chatReactionRemoved,
  chatCommandInvoked,
  chatMemberJoined,
  chatMemberLeft
];

export let telegramChatAdapter = ChatAdapter.register({
  tools: telegramChatTools,
  triggers: telegramChatTriggers,
  capabilities: {
    message_reply: true,
    content_markdown: true,
    content_images: false,
    content_rich_links: true,
    content_fields: true,
    content_tables: true,
    content_charts: false,
    content_cards: false,
    content_sections: true,
    attachment_image: true,
    attachment_file: true,
    attachment_video: true,
    attachment_audio: true,
    message_ephemeral_native: false,
    message_quote: false,
    message_unfurls: false,
    message_mentions: false,
    reaction_custom_emoji: false,
    channel_private: true,
    channel_shared: false,
    channel_announcement: true,
    channel_forum: true,
    thread_posts: true,
    thread_subject: false,
    typing_without_thread: true,
    resource_context: false,
    command_freeform: true,
    command_structured_options: false,
    command_subcommands: false
  }
});

export * from './tools';
export * from './triggers';
