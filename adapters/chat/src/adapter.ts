import { defineAdapter } from '@slates/adapter';

export let ChatAdapter = defineAdapter({
  id: 'chat',
  name: 'Chat',
  capabilities: {
    message_send: { tools: ['chat.message.send'] },
    message_edit: { tools: ['chat.message.edit'] },
    message_delete: { tools: ['chat.message.delete'] },
    message_send_ephemeral: { tools: ['chat.message.sendEphemeral'] },
    inbound_message: { triggers: ['chat.message.received'] },
    inbound_message_updated: { triggers: ['chat.message.updated'] },
    inbound_message_deleted: { triggers: ['chat.message.deleted'] },

    message_reaction_add: { tools: ['chat.reaction.add'] },
    message_reaction_remove: { tools: ['chat.reaction.add', 'chat.reaction.remove'] },
    message_reaction_list: { tools: ['chat.reaction.list'] },
    inbound_reaction_added: { triggers: ['chat.reaction.added'] },
    inbound_reaction_removed: { triggers: ['chat.reaction.removed'] },

    message_read: { tools: ['chat.message.get', 'chat.message.list'] },
    message_mark_read: { tools: ['chat.message.markRead'] },
    message_search: { tools: ['chat.message.search'] },
    message_reply: { tools: ['chat.message.reply'] },

    channel_read: { tools: ['chat.channel.list', 'chat.channel.get'] },
    channel_members_read: { tools: ['chat.channel.members'] },
    workspace_read: { tools: ['chat.workspace.list', 'chat.workspace.get'] },
    thread_read: { tools: ['chat.thread.list', 'chat.thread.get'] },

    dm_open_single: { tools: ['chat.dm.openSingle'] },
    dm_open_group: { tools: ['chat.dm.openGroup'] },

    user_read: { tools: ['chat.user.get'] },
    user_search: { tools: ['chat.user.search'] },
    file_upload: { tools: ['chat.file.upload'] },
    file_download: { tools: ['chat.file.download'] },

    interaction_modals: { tools: ['chat.modal.open'] },
    inbound_modal_submitted: { triggers: ['chat.modal.submitted'] },
    inbound_modal_closed: { triggers: ['chat.modal.closed'] },
    inbound_actions: { triggers: ['chat.action.invoked'] },
    inbound_options_load: { triggers: ['chat.options.load'] },

    inbound_mention: { triggers: ['chat.mention.received'] },

    typing: { tools: ['chat.typing.start'] },

    inbound_command: { triggers: ['chat.command.invoked'] },
    command_respond: { tools: ['chat.command.respond'] },
    command_read: { tools: ['chat.command.list'] },
    command_autocomplete: { triggers: ['chat.command.autocomplete'] },
    inbound_member_joined: { triggers: ['chat.member.joined'] },
    inbound_member_left: { triggers: ['chat.member.left'] },

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
    command_subcommands: {}
  }
});
