import { ChatAdapter } from '@slates/adapter-chat';
import {
  chatAddReaction,
  chatDownloadFile,
  chatGetAuthenticatedUser,
  chatGetChannel,
  chatGetSetup,
  chatGetUser,
  chatGetWorkspace,
  chatListWorkspaces,
  chatMarkMessageRead,
  chatRemoveReaction,
  chatSendMessage,
  chatStartTyping,
  chatUploadFile
} from './tools';
import {
  chatMessageReceived,
  chatMessageUpdated,
  chatReactionAdded,
  chatReactionRemoved
} from './triggers';

export let messengerChatTools = [
  chatSendMessage,
  chatMarkMessageRead,
  chatAddReaction,
  chatRemoveReaction,
  chatGetChannel,
  chatListWorkspaces,
  chatGetWorkspace,
  chatGetUser,
  chatGetAuthenticatedUser,
  chatUploadFile,
  chatDownloadFile,
  chatStartTyping,
  chatGetSetup
];

export let messengerChatTriggers = [
  chatMessageReceived,
  chatMessageUpdated,
  chatReactionAdded,
  chatReactionRemoved
];

export let messengerChatAdapter = ChatAdapter.register({
  tools: messengerChatTools,
  triggers: messengerChatTriggers,
  capabilities: {
    // Send API `reply_to.mid` quotes a specific message.
    message_reply: true,
    // Messenger renders plain text; markdown, tables, and fields are flattened.
    content_markdown: false,
    content_images: false,
    content_rich_links: false,
    content_fields: false,
    content_tables: false,
    content_charts: false,
    content_cards: false,
    content_sections: false,
    // Files are sent as their own messages through file.upload.
    attachment_image: true,
    attachment_file: true,
    attachment_video: true,
    attachment_audio: true,
    message_ephemeral_native: false,
    message_quote: false,
    message_unfurls: false,
    message_mentions: false,
    reaction_custom_emoji: false,
    channel_private: false,
    channel_shared: false,
    channel_announcement: false,
    channel_forum: false,
    thread_posts: false,
    thread_subject: false,
    // `typing_on` applies to the whole one-to-one conversation.
    typing_without_thread: true,
    resource_context: false,
    command_freeform: false,
    command_structured_options: false,
    command_subcommands: false
  }
});

export * from './tools';
export * from './triggers';
