import { ChatAdapter } from '@slates/adapter-chat';
import {
  chatAddReaction,
  chatDownloadFile,
  chatGetAuthenticatedUser,
  chatGetChannel,
  chatGetSetup,
  chatGetWorkspace,
  chatListWorkspaces,
  chatMarkMessageRead,
  chatRemoveReaction,
  chatSendMessage,
  chatUploadFile
} from './tools';
import { chatMessageReceived, chatReactionAdded, chatReactionRemoved } from './triggers';

/**
 * Omitted actions (see README): message edit/delete (the Cloud API cannot edit
 * or delete business messages), typing (needs an inbound message id, which the
 * contract does not carry), ephemeral messages, threads, message history/search,
 * channel/user listing, DMs, and commands (no provider equivalent).
 */
export let whatsappChatTools = [
  chatSendMessage,
  chatMarkMessageRead,
  chatAddReaction,
  chatRemoveReaction,
  chatGetChannel,
  chatListWorkspaces,
  chatGetWorkspace,
  chatGetAuthenticatedUser,
  chatUploadFile,
  chatDownloadFile,
  chatGetSetup
];

export let whatsappChatTriggers = [
  chatMessageReceived,
  chatReactionAdded,
  chatReactionRemoved
];

export let whatsappChatAdapter = ChatAdapter.register({
  tools: whatsappChatTools,
  triggers: whatsappChatTriggers,
  capabilities: {
    // Contextual replies quote the replied-to message.
    message_reply: true,
    message_quote: true,
    // Markdown is rendered to WhatsApp formatting; other structures use text fallbacks.
    content_markdown: true,
    content_images: false,
    content_rich_links: false,
    content_fields: false,
    content_tables: false,
    content_charts: false,
    content_cards: false,
    content_sections: false,
    attachment_image: true,
    attachment_file: true,
    attachment_video: true,
    attachment_audio: true,
    message_ephemeral_native: false,
    message_unfurls: false,
    message_mentions: false,
    reaction_custom_emoji: false,
    channel_private: false,
    channel_shared: false,
    channel_announcement: false,
    channel_forum: false,
    thread_posts: false,
    thread_subject: false,
    typing_without_thread: false,
    resource_context: false,
    command_freeform: false,
    command_structured_options: false,
    command_subcommands: false,
    // Customer ids are usually phone numbers, but Meta may supply a
    // business-scoped user id instead, so this is not guaranteed.
    user_id_is_email: false,
    user_id_is_phone_number: false
  }
});

export * from './tools';
export * from './triggers';
