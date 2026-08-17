import { defineAdapter } from '@slates/adapter';

export let ChatAdapter = defineAdapter({
  id: 'chat',
  name: 'Chat',
  capabilities: {
    message_send: { tools: ['metorial_chat$message.send'] },
    message_edit: { tools: ['metorial_chat$message.edit'] },
    message_delete: { tools: ['metorial_chat$message.delete'] },
    message_send_ephemeral: { tools: ['metorial_chat$message.sendEphemeral'] },
    inbound_message: { triggers: ['metorial_chat$message.received'] },
    inbound_message_updated: { triggers: ['metorial_chat$message.updated'] },
    inbound_message_deleted: { triggers: ['metorial_chat$message.deleted'] },

    message_reaction_add: { tools: ['metorial_chat$reaction.add'] },
    message_reaction_remove: {
      tools: ['metorial_chat$reaction.add', 'metorial_chat$reaction.remove']
    },
    message_reaction_list: { tools: ['metorial_chat$reaction.list'] },
    inbound_reaction_added: { triggers: ['metorial_chat$reaction.added'] },
    inbound_reaction_removed: { triggers: ['metorial_chat$reaction.removed'] },

    message_read: { tools: ['metorial_chat$message.get', 'metorial_chat$message.list'] },
    message_mark_read: { tools: ['metorial_chat$message.markRead'] },
    message_search: { tools: ['metorial_chat$message.search'] },
    message_reply: { tools: ['metorial_chat$message.reply'] },

    channel_read: { tools: ['metorial_chat$channel.list', 'metorial_chat$channel.get'] },
    channel_members_read: { tools: ['metorial_chat$channel.members'] },
    workspace_read: { tools: ['metorial_chat$workspace.list', 'metorial_chat$workspace.get'] },
    thread_read: { tools: ['metorial_chat$thread.list', 'metorial_chat$thread.get'] },

    dm_open_single: { tools: ['metorial_chat$dm.openSingle'] },
    dm_open_group: { tools: ['metorial_chat$dm.openGroup'] },

    user_read: { tools: ['metorial_chat$user.get'] },
    user_search: { tools: ['metorial_chat$user.search'] },
    file_upload: { tools: ['metorial_chat$file.upload'] },
    file_download: { tools: ['metorial_chat$file.download'] },

    interaction_modals: { tools: ['metorial_chat$modal.open'] },
    inbound_modal_submitted: { triggers: ['metorial_chat$modal.submitted'] },
    inbound_modal_closed: { triggers: ['metorial_chat$modal.closed'] },
    inbound_actions: { triggers: ['metorial_chat$action.invoked'] },
    inbound_options_load: { triggers: ['metorial_chat$options.load'] },

    inbound_mention: { triggers: ['metorial_chat$mention.received'] },

    typing: { tools: ['metorial_chat$typing.start'] },

    inbound_command: { triggers: ['metorial_chat$command.invoked'] },
    command_respond: { tools: ['metorial_chat$command.respond'] },
    command_read: { tools: ['metorial_chat$command.list'] },
    command_autocomplete: { triggers: ['metorial_chat$command.autocomplete'] },
    inbound_member_joined: { triggers: ['metorial_chat$member.joined'] },
    inbound_member_left: { triggers: ['metorial_chat$member.left'] },

    content_markdown: {},
    content_images: {},
    content_rich_links: {},
    content_fields: {},
    content_tables: {},
    content_charts: {},
    content_cards: {},
    content_sections: {},
    content_actions: {},

    attachment_image: {},
    attachment_file: {},
    attachment_video: {},
    attachment_audio: {},

    action_buttons: {},
    action_link_buttons: {},
    action_selects: {},
    action_radio_selects: {},
    action_external_selects: {},
    action_open_modal: {},

    modal_text_input: {},
    modal_date_input: {},
    modal_number_input: {},
    modal_selects: {},
    modal_notify_on_close: {},

    message_ephemeral_native: {},
    message_quote: {},
    message_unfurls: {},
    message_mentions: {},
    reaction_custom_emoji: {},

    channel_private: {},
    channel_shared: {},
    channel_announcement: {},
    channel_forum: {},
    thread_posts: {},
    thread_subject: {},
    resource_context: {},

    command_freeform: {},
    command_structured_options: {},
    command_subcommands: {},

    provider_setup: { tools: ['metorial_chat$setup.get'] }
  }
});
