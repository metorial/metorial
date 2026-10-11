import { ChatAdapter } from '@slates/adapter-chat';
import {
  chatAddReaction,
  chatDeleteMessage,
  chatDownloadFile,
  chatEditMessage,
  chatGetAuthenticatedUser,
  chatGetChannel,
  chatGetMessage,
  chatGetSetup,
  chatGetUser,
  chatGetWorkspace,
  chatListChannels,
  chatListCommands,
  chatListMessages,
  chatListReactions,
  chatListWorkspaces,
  chatOpenSingleDm,
  chatRemoveReaction,
  chatRespondToCommand,
  chatSendMessage,
  chatStartTyping,
  chatUploadFile
} from './tools';
import {
  chatCommandInvoked,
  chatMentionReceived,
  chatMessageDeleted,
  chatMessageReceived,
  chatMessageUpdated,
  chatReactionAdded,
  chatReactionRemoved
} from './triggers';

export let discordChatTools = [
  chatSendMessage,
  chatEditMessage,
  chatDeleteMessage,
  chatGetMessage,
  chatListMessages,
  chatAddReaction,
  chatRemoveReaction,
  chatListReactions,
  chatListChannels,
  chatGetChannel,
  chatListWorkspaces,
  chatGetWorkspace,
  chatOpenSingleDm,
  chatGetUser,
  chatGetAuthenticatedUser,
  chatUploadFile,
  chatDownloadFile,
  chatRespondToCommand,
  chatListCommands,
  chatStartTyping,
  chatGetSetup
];

export let discordChatTriggers = [
  chatMessageReceived,
  chatMessageUpdated,
  chatMessageDeleted,
  chatMentionReceived,
  chatReactionAdded,
  chatReactionRemoved,
  chatCommandInvoked
];

export let discordChatAdapter = ChatAdapter.register({
  tools: discordChatTools,
  triggers: discordChatTriggers,
  capabilities: {
    message_reply: true,
    content_markdown: true,
    content_images: true,
    content_rich_links: true,
    content_fields: true,
    content_tables: false,
    content_charts: false,
    content_cards: true,
    content_sections: false,
    attachment_image: true,
    attachment_file: true,
    attachment_video: true,
    attachment_audio: true,
    message_ephemeral_native: false,
    message_quote: false,
    message_unfurls: true,
    message_mentions: true,
    reaction_custom_emoji: true,
    channel_private: true,
    channel_shared: false,
    channel_announcement: true,
    channel_forum: false,
    thread_posts: true,
    thread_subject: false,
    typing_without_thread: true,
    resource_context: false,
    command_freeform: false,
    command_structured_options: true,
    command_subcommands: true
  }
});

export * from './tools';
export * from './triggers';
