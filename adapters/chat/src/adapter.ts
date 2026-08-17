import { defineAdapter } from '@slates/adapter';

export let ChatAdapter = defineAdapter({
  id: 'chat',
  name: 'Chat',
  capabilities: {
    send: { tools: ['chat.message.send'] },
    edit: { tools: ['chat.message.edit'] },
    delete: { tools: ['chat.message.delete'] },
    read: { tools: ['chat.message.get', 'chat.message.list'] },
    search: { tools: ['chat.message.search'] },
    reply: { tools: ['chat.message.reply'] },
    ephemeral: { tools: ['chat.message.sendEphemeral'] },
    schedule: { tools: ['chat.message.schedule', 'chat.message.cancelScheduled'] },
    react: { tools: ['chat.reaction.add', 'chat.reaction.remove'] },
    channels: { tools: ['chat.channel.list', 'chat.channel.get'] },
    workspaces: { tools: ['chat.workspace.list', 'chat.workspace.get'] },
    threads: { tools: ['chat.thread.list', 'chat.thread.get'] },
    dms: { tools: ['chat.dm.open'] },
    users: { tools: ['chat.user.get'] },
    files: { tools: ['chat.file.upload'] },
    modals: { tools: ['chat.modal.open'] },
    typing: { tools: ['chat.typing.start'] },
    inbound: { triggers: ['chat.message.received'] },
    mentions: { triggers: ['chat.mention.received'] },
    inbound_actions: { triggers: ['chat.action.invoked'] },
    inbound_reactions: { triggers: ['chat.reaction.added'] },
    cards: { tools: ['chat.message.send'] },
    markdown: { tools: ['chat.message.send'] }
  }
});
