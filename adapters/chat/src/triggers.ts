import { z } from 'zod';
import { ChatAdapter } from './adapter';
import { authorSchema } from './schema/channels/author';
import { channelSchema } from './schema/channels/channel';
import { threadSchema } from './schema/channels/thread';
import { messageSchema } from './schema/content/message';
import {
  actionInvokedSchema,
  modalClosedSchema,
  modalSubmittedSchema,
  optionsLoadSchema,
  reactionEventSchema
} from './schema/interactions/action';
import {
  commandAutocompleteSchema,
  commandInvokedSchema,
  commandOptionValueSchema
} from './schema/interactions/command';
import { rawSchema } from './schema/shared/raw';

export let messageReceived = ChatAdapter.defineTrigger({
  key: 'chat.message.received',
  name: 'Message Received',
  description: 'Fires when a new message is posted.',
  input: messageSchema,
  output: z.object({
    type: z.literal('chat.message.received'),
    id: z.string(),
    message: messageSchema,
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let messageUpdated = ChatAdapter.defineTrigger({
  key: 'chat.message.updated',
  name: 'Message Updated',
  description: 'Fires when a message is edited.',
  input: messageSchema,
  output: z.object({
    type: z.literal('chat.message.updated'),
    id: z.string(),
    message: messageSchema,
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let messageDeleted = ChatAdapter.defineTrigger({
  key: 'chat.message.deleted',
  name: 'Message Deleted',
  description: 'Fires when a message is deleted.',
  input: z.object({
    channelId: z.string(),
    messageId: z.string(),
    threadId: z.string().optional(),
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  }),
  output: z.object({
    type: z.literal('chat.message.deleted'),
    id: z.string(),
    channelId: z.string(),
    messageId: z.string(),
    threadId: z.string().optional(),
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let mentionReceived = ChatAdapter.defineTrigger({
  key: 'chat.mention.received',
  name: 'Mention Received',
  description: 'Fires when the bot is mentioned.',
  input: messageSchema,
  output: z.object({
    type: z.literal('chat.mention.received'),
    id: z.string(),
    message: messageSchema,
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let reactionAdded = ChatAdapter.defineTrigger({
  key: 'chat.reaction.added',
  name: 'Reaction Added',
  description: 'Fires when a user adds a reaction to a message.',
  input: reactionEventSchema,
  output: z.object({
    type: z.literal('chat.reaction.added'),
    id: z.string(),
    messageId: z.string(),
    channelId: z.string(),
    emoji: reactionEventSchema.shape.emoji,
    author: authorSchema,
    message: messageSchema.optional(),
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let reactionRemoved = ChatAdapter.defineTrigger({
  key: 'chat.reaction.removed',
  name: 'Reaction Removed',
  description: 'Fires when a user removes a reaction from a message.',
  input: reactionEventSchema,
  output: z.object({
    type: z.literal('chat.reaction.removed'),
    id: z.string(),
    messageId: z.string(),
    channelId: z.string(),
    emoji: reactionEventSchema.shape.emoji,
    author: authorSchema,
    message: messageSchema.optional(),
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let actionInvoked = ChatAdapter.defineTrigger({
  key: 'chat.action.invoked',
  name: 'Action Invoked',
  description: 'Fires when a user clicks a button or submits a select on a card.',
  input: actionInvokedSchema,
  output: z.object({
    type: z.literal('chat.action.invoked'),
    id: z.string(),
    actionId: z.string(),
    value: z.string().optional(),
    messageId: z.string(),
    channelId: z.string(),
    author: authorSchema,
    triggerId: z.string().optional(),
    selectedValues: z.record(z.string(), z.string()).optional(),
    message: messageSchema.optional(),
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let modalSubmitted = ChatAdapter.defineTrigger({
  key: 'chat.modal.submitted',
  name: 'Modal Submitted',
  description: 'Fires when a user submits a modal form.',
  input: modalSubmittedSchema,
  output: z.object({
    type: z.literal('chat.modal.submitted'),
    id: z.string(),
    callbackId: z.string(),
    viewId: z.string(),
    values: z.record(z.string(), z.unknown()),
    author: authorSchema,
    privateMetadata: z.string().optional(),
    triggerId: z.string().optional(),
    message: messageSchema.optional(),
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let modalClosed = ChatAdapter.defineTrigger({
  key: 'chat.modal.closed',
  name: 'Modal Closed',
  description: 'Fires when a user closes a modal without submitting.',
  input: modalClosedSchema,
  output: z.object({
    type: z.literal('chat.modal.closed'),
    id: z.string(),
    callbackId: z.string(),
    viewId: z.string().optional(),
    author: authorSchema,
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let optionsLoad = ChatAdapter.defineTrigger({
  key: 'chat.options.load',
  name: 'Options Load',
  description: 'Fires when a user types into an external select.',
  input: optionsLoadSchema,
  output: z.object({
    type: z.literal('chat.options.load'),
    id: z.string(),
    actionId: z.string(),
    query: z.string(),
    minQueryLength: z.number().int().optional(),
    raw: rawSchema
  })
});

export let commandInvoked = ChatAdapter.defineTrigger({
  key: 'chat.command.invoked',
  name: 'Command Invoked',
  description: 'Fires when a user runs a slash command.',
  input: commandInvokedSchema,
  output: z.object({
    type: z.literal('chat.command.invoked'),
    id: z.string(),
    name: z.string(),
    commandId: z.string().optional(),
    text: z.string().optional(),
    subcommand: z.string().optional(),
    subcommandGroup: z.string().optional(),
    options: z.array(commandOptionValueSchema).optional(),
    author: authorSchema,
    channelId: z.string(),
    threadId: z.string().optional(),
    triggerId: z.string().optional(),
    responseToken: z.string().optional(),
    message: messageSchema.optional(),
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let commandAutocomplete = ChatAdapter.defineTrigger({
  key: 'chat.command.autocomplete',
  name: 'Command Autocomplete',
  description:
    'Fires when a user types into a slash command option that supports suggestions.',
  input: commandAutocompleteSchema,
  output: z.object({
    type: z.literal('chat.command.autocomplete'),
    id: z.string(),
    name: z.string(),
    commandId: z.string().optional(),
    subcommand: z.string().optional(),
    subcommandGroup: z.string().optional(),
    optionName: z.string(),
    query: z.string(),
    options: z.array(commandOptionValueSchema).optional(),
    author: authorSchema.optional(),
    channelId: z.string().optional(),
    responseToken: z.string().optional(),
    raw: rawSchema
  })
});

export let memberJoined = ChatAdapter.defineTrigger({
  key: 'chat.member.joined',
  name: 'Member Joined',
  description: 'Fires when a user joins a channel.',
  input: z.object({
    channelId: z.string(),
    author: authorSchema,
    channel: channelSchema.optional(),
    raw: rawSchema
  }),
  output: z.object({
    type: z.literal('chat.member.joined'),
    id: z.string(),
    channelId: z.string(),
    author: authorSchema,
    channel: channelSchema.optional(),
    raw: rawSchema
  })
});

export let memberLeft = ChatAdapter.defineTrigger({
  key: 'chat.member.left',
  name: 'Member Left',
  description: 'Fires when a user leaves a channel.',
  input: z.object({
    channelId: z.string(),
    author: authorSchema,
    channel: channelSchema.optional(),
    raw: rawSchema
  }),
  output: z.object({
    type: z.literal('chat.member.left'),
    id: z.string(),
    channelId: z.string(),
    author: authorSchema,
    channel: channelSchema.optional(),
    raw: rawSchema
  })
});
