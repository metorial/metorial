import { ChatAdapter } from '@slates/adapter-chat';
import {
  chatDeleteMessage,
  chatDownloadFile,
  chatEditMessage,
  chatGetAuthenticatedUser,
  chatGetChannel,
  chatGetMessage,
  chatGetSetup,
  chatGetWorkspace,
  chatListChannelMembers,
  chatListChannels,
  chatListWorkspaces,
  chatOpenSingleDm,
  chatSendEphemeralMessage,
  chatSendMessage
} from './tools';
import { chatCommandInvoked, chatMentionReceived, chatMessageReceived } from './triggers';

// Other actions need user auth or admin-approved chat.app.* scopes, or have no Google API.
export let googleChatChatTools = [
  chatSendMessage,
  chatEditMessage,
  chatDeleteMessage,
  chatGetMessage,
  chatSendEphemeralMessage,
  chatListChannels,
  chatGetChannel,
  chatListChannelMembers,
  chatListWorkspaces,
  chatGetWorkspace,
  chatOpenSingleDm,
  chatGetAuthenticatedUser,
  chatDownloadFile,
  chatGetSetup
];

export let googleChatChatTriggers = [
  chatMessageReceived,
  chatMentionReceived,
  chatCommandInvoked
];

export let googleChatChatAdapter = ChatAdapter.register({
  tools: googleChatChatTools,
  triggers: googleChatChatTriggers,
  capabilities: {
    message_reply: true,
    content_markdown: true,
    content_images: false,
    content_rich_links: false,
    content_fields: false,
    content_tables: false,
    content_charts: false,
    content_cards: false,
    content_sections: false,
    attachment_image: false,
    attachment_file: false,
    attachment_video: false,
    attachment_audio: false,
    message_ephemeral_native: true,
    message_quote: false,
    message_unfurls: false,
    message_mentions: false,
    reaction_custom_emoji: false,
    channel_private: false,
    channel_shared: true,
    channel_announcement: false,
    channel_forum: false,
    thread_posts: true,
    thread_subject: false,
    typing_without_thread: false,
    resource_context: false,
    command_freeform: true,
    command_structured_options: false,
    command_subcommands: false
  }
});

export * from './tools';
export * from './triggers';
