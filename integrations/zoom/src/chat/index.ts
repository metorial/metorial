import { ChatAdapter } from '@slates/adapter-chat';
import {
  chatDeleteMessage,
  chatEditMessage,
  chatGetAuthenticatedUser,
  chatGetChannel,
  chatGetSetup,
  chatGetWorkspace,
  chatListWorkspaces,
  chatSendMessage
} from './tools';
import { chatCommandInvoked, chatMessageReceived } from './triggers';

export let zoomChatTools = [
  chatSendMessage,
  chatEditMessage,
  chatDeleteMessage,
  chatListWorkspaces,
  chatGetWorkspace,
  chatGetChannel,
  chatGetAuthenticatedUser,
  chatGetSetup
];

export let zoomChatTriggers = [chatMessageReceived, chatCommandInvoked];

export let zoomChatAdapter = ChatAdapter.register({
  tools: zoomChatTools,
  triggers: zoomChatTriggers,
  capabilities: {
    message_reply: true,
    thread_posts: true,
    content_markdown: true,
    content_images: true,
    content_fields: true,
    content_sections: true,
    content_cards: true,
    content_rich_links: false,
    content_tables: false,
    content_charts: false,
    attachment_image: false,
    attachment_file: false,
    attachment_video: false,
    attachment_audio: false,
    message_ephemeral_native: false,
    message_quote: false,
    message_unfurls: false,
    message_mentions: false,
    reaction_custom_emoji: false,
    channel_private: false,
    channel_shared: false,
    channel_announcement: false,
    channel_forum: false,
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
