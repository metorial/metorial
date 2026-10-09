import { ChatAdapter } from '@slates/adapter-chat';
import {
  chatDeleteMessage,
  chatDownloadFile,
  chatEditMessage,
  chatGetAuthenticatedUser,
  chatGetChannel,
  chatGetSetup,
  chatGetWorkspace,
  chatListChannelMembers,
  chatListWorkspaces,
  chatOpenSingleDm,
  chatSendMessage,
  chatStartTyping
} from './tools';
import {
  chatMemberJoined,
  chatMemberLeft,
  chatMentionReceived,
  chatMessageDeleted,
  chatMessageReceived,
  chatMessageUpdated,
  chatReactionAdded,
  chatReactionRemoved
} from './triggers';

export let teamsChatTools = [
  chatSendMessage,
  chatEditMessage,
  chatDeleteMessage,
  chatGetChannel,
  chatListChannelMembers,
  chatListWorkspaces,
  chatGetWorkspace,
  chatGetAuthenticatedUser,
  chatOpenSingleDm,
  chatDownloadFile,
  chatStartTyping,
  chatGetSetup
];

export let teamsChatTriggers = [
  chatMessageReceived,
  chatMessageUpdated,
  chatMessageDeleted,
  chatMentionReceived,
  chatReactionAdded,
  chatReactionRemoved,
  chatMemberJoined,
  chatMemberLeft
];

export let teamsChatAdapter = ChatAdapter.register({
  tools: teamsChatTools,
  triggers: teamsChatTriggers,
  capabilities: {
    // Replies post into a channel thread or answer an activity in a chat.
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
    message_ephemeral_native: false,
    message_quote: false,
    message_unfurls: false,
    message_mentions: false,
    reaction_custom_emoji: false,
    // Bots cannot post in private channels.
    channel_private: false,
    channel_shared: false,
    channel_announcement: false,
    channel_forum: false,
    thread_posts: true,
    thread_subject: false,
    typing_without_thread: true,
    resource_context: false,
    command_freeform: false,
    command_structured_options: false,
    command_subcommands: false
  }
});

export * from './tools';
export * from './triggers';
