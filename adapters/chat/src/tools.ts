import { z } from 'zod';
import { ChatAdapter } from './adapter';
import { authorSchema } from './schema/channels/author';
import { channelSchema, channelTypeSchema } from './schema/channels/channel';
import { threadSchema } from './schema/channels/thread';
import { workspaceSchema } from './schema/channels/workspace';
import { attachmentRefSchema } from './schema/content/attachment';
import { chatBodySchema } from './schema/content/body';
import { messageSchema } from './schema/content/message';
import { modalSchema } from './schema/interactions/modal';
import { cursorPageResultSchema, cursorPageSchema } from './schema/shared/cursor';
import { emojiInputSchema } from './schema/shared/emoji';
import { reactionCountSchema } from './schema/shared/reaction';

let partsInstructions = [
  'Provide a parts array: GFM markdown parts for prose, text parts for unparsed strings, card parts for structured UI.',
  'Structured UI belongs in card/parts, not inside a markdown string.',
  'Set altText for notifications and clients that cannot render parts. Attachments belong on the same body.'
];

let okSchema = z.object({
  ok: z.boolean()
});

let messageOutputSchema = z.object({
  message: messageSchema
});

export let sendMessage = ChatAdapter.defineTool({
  key: 'chat.message.send',
  name: 'Send Message',
  description:
    'Send a message to a channel or thread as a parts document (markdown, text, cards, and attachments).',
  instructions: partsInstructions,
  input: chatBodySchema.extend({
    channelId: z.string().describe('Channel to send the message to'),
    threadId: z.string().optional().describe('Thread id when posting a reply in a thread'),
    replyToId: z.string().optional().describe('Message id to quote or reply to'),
    ephemeral: z
      .boolean()
      .optional()
      .describe('If true, only targetUserId can see the message'),
    targetUserId: z.string().optional().describe('Required when ephemeral is true')
  }),
  output: messageOutputSchema
});

export let editMessage = ChatAdapter.defineTool({
  key: 'chat.message.edit',
  name: 'Edit Message',
  description: 'Replace the body of an existing message.',
  instructions: partsInstructions,
  input: chatBodySchema.extend({
    channelId: z.string(),
    messageId: z.string()
  }),
  output: messageOutputSchema
});

export let deleteMessage = ChatAdapter.defineTool({
  key: 'chat.message.delete',
  name: 'Delete Message',
  description: 'Delete a message.',
  tags: { destructive: true },
  input: z.object({
    channelId: z.string(),
    messageId: z.string()
  }),
  output: okSchema
});

export let getMessage = ChatAdapter.defineTool({
  key: 'chat.message.get',
  name: 'Get Message',
  description: 'Fetch a single message by id.',
  tags: { readOnly: true },
  input: z.object({
    channelId: z.string(),
    messageId: z.string()
  }),
  output: messageOutputSchema
});

export let listMessages = ChatAdapter.defineTool({
  key: 'chat.message.list',
  name: 'List Messages',
  description:
    'List messages in a channel or thread. Each page is chronological (oldest first). Default direction is backward (older). nextCursor continues in that direction; prevCursor pages the other way when the platform supports it.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    channelId: z.string(),
    threadId: z.string().optional()
  }),
  output: cursorPageResultSchema.extend({
    messages: z.array(messageSchema)
  })
});

export let searchMessages = ChatAdapter.defineTool({
  key: 'chat.message.search',
  name: 'Search Messages',
  description: 'Search messages by query, optionally scoped to a channel.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    query: z.string(),
    channelId: z.string().optional()
  }),
  output: cursorPageResultSchema.extend({
    messages: z.array(messageSchema)
  })
});

export let replyMessage = ChatAdapter.defineTool({
  key: 'chat.message.reply',
  name: 'Reply to Message',
  description: 'Reply to an existing message, creating or continuing a thread when supported.',
  instructions: partsInstructions,
  input: chatBodySchema.extend({
    channelId: z.string(),
    messageId: z.string()
  }),
  output: messageOutputSchema
});

export let sendEphemeralMessage = ChatAdapter.defineTool({
  key: 'chat.message.sendEphemeral',
  name: 'Send Ephemeral Message',
  description: 'Send a message visible only to one user. Providers may fall back to a DM.',
  instructions: partsInstructions,
  input: chatBodySchema.extend({
    channelId: z.string(),
    userId: z.string(),
    threadId: z.string().optional()
  }),
  output: z.object({
    message: messageSchema,
    usedFallback: z.boolean()
  })
});

export let scheduleMessage = ChatAdapter.defineTool({
  key: 'chat.message.schedule',
  name: 'Schedule Message',
  description: 'Schedule a message for future delivery.',
  instructions: partsInstructions,
  input: chatBodySchema.extend({
    channelId: z.string(),
    threadId: z.string().optional(),
    postAt: z.string().describe('ISO-8601 timestamp')
  }),
  output: z.object({
    scheduledMessageId: z.string(),
    postAt: z.string(),
    channelId: z.string()
  })
});

export let cancelScheduledMessage = ChatAdapter.defineTool({
  key: 'chat.message.cancelScheduled',
  name: 'Cancel Scheduled Message',
  description: 'Cancel a previously scheduled message.',
  tags: { destructive: true },
  input: z.object({
    scheduledMessageId: z.string(),
    channelId: z.string().optional()
  }),
  output: okSchema
});

export let markMessageRead = ChatAdapter.defineTool({
  key: 'chat.message.markRead',
  name: 'Mark Message Read',
  description: 'Send a read receipt for a message.',
  input: z.object({
    channelId: z.string(),
    messageId: z.string(),
    threadId: z.string().optional()
  }),
  output: okSchema
});

export let getMessagePermalink = ChatAdapter.defineTool({
  key: 'chat.message.permalink',
  name: 'Get Message Permalink',
  description: 'Get a permalink URL for a message.',
  tags: { readOnly: true },
  input: z.object({
    channelId: z.string(),
    messageId: z.string()
  }),
  output: z.object({
    url: z.string()
  })
});

export let addReaction = ChatAdapter.defineTool({
  key: 'chat.reaction.add',
  name: 'Add Reaction',
  description:
    'Add a reaction to a message. Emoji may be Unicode (👍), a Slack shortcode (:+1:), or a custom emoji object.',
  input: z.object({
    channelId: z.string(),
    messageId: z.string(),
    emoji: emojiInputSchema
  }),
  output: okSchema
});

export let removeReaction = ChatAdapter.defineTool({
  key: 'chat.reaction.remove',
  name: 'Remove Reaction',
  description: 'Remove a reaction from a message.',
  tags: { destructive: true },
  input: z.object({
    channelId: z.string(),
    messageId: z.string(),
    emoji: emojiInputSchema
  }),
  output: okSchema
});

export let listReactions = ChatAdapter.defineTool({
  key: 'chat.reaction.list',
  name: 'List Reactions',
  description: 'List reactions on a message.',
  tags: { readOnly: true },
  input: z.object({
    channelId: z.string(),
    messageId: z.string()
  }),
  output: z.object({
    reactions: z.array(reactionCountSchema)
  })
});

export let listChannels = ChatAdapter.defineTool({
  key: 'chat.channel.list',
  name: 'List Channels',
  description: 'List channels the bot can see.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    workspaceId: z.string().optional().describe('Limit to channels in this workspace'),
    type: channelTypeSchema.optional(),
    query: z.string().optional()
  }),
  output: cursorPageResultSchema.extend({
    channels: z.array(channelSchema)
  })
});

export let getChannel = ChatAdapter.defineTool({
  key: 'chat.channel.get',
  name: 'Get Channel',
  description: 'Fetch channel metadata.',
  tags: { readOnly: true },
  input: z.object({
    channelId: z.string()
  }),
  output: z.object({
    channel: channelSchema
  })
});

export let listWorkspaces = ChatAdapter.defineTool({
  key: 'chat.workspace.list',
  name: 'List Workspaces',
  description: 'List workspaces the bot can see.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    query: z.string().optional()
  }),
  output: cursorPageResultSchema.extend({
    workspaces: z.array(workspaceSchema)
  })
});

export let getWorkspace = ChatAdapter.defineTool({
  key: 'chat.workspace.get',
  name: 'Get Workspace',
  description: 'Fetch workspace metadata.',
  tags: { readOnly: true },
  input: z.object({
    workspaceId: z.string()
  }),
  output: z.object({
    workspace: workspaceSchema
  })
});

export let listChannelMembers = ChatAdapter.defineTool({
  key: 'chat.channel.members',
  name: 'List Channel Members',
  description: 'List members of a channel.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    channelId: z.string()
  }),
  output: cursorPageResultSchema.extend({
    authors: z.array(authorSchema)
  })
});

export let listThreads = ChatAdapter.defineTool({
  key: 'chat.thread.list',
  name: 'List Threads',
  description: 'List threads in a channel.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    channelId: z.string()
  }),
  output: cursorPageResultSchema.extend({
    threads: z.array(threadSchema)
  })
});

export let getThread = ChatAdapter.defineTool({
  key: 'chat.thread.get',
  name: 'Get Thread',
  description: 'Fetch thread metadata.',
  tags: { readOnly: true },
  input: z.object({
    channelId: z.string(),
    threadId: z.string()
  }),
  output: z.object({
    thread: threadSchema
  })
});

export let openDm = ChatAdapter.defineTool({
  key: 'chat.dm.open',
  name: 'Open Direct Message',
  description: 'Open or fetch a direct message conversation with a user.',
  input: z.object({
    userId: z.string()
  }),
  output: z.object({
    channelId: z.string(),
    threadId: z.string().optional()
  })
});

export let getUser = ChatAdapter.defineTool({
  key: 'chat.user.get',
  name: 'Get User',
  description: 'Look up a user by id.',
  tags: { readOnly: true },
  input: z.object({
    userId: z.string()
  }),
  output: z.object({
    author: authorSchema
  })
});

export let searchUsers = ChatAdapter.defineTool({
  key: 'chat.user.search',
  name: 'Search Users',
  description: 'Search users by name or handle.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    query: z.string()
  }),
  output: cursorPageResultSchema.extend({
    authors: z.array(authorSchema)
  })
});

export let uploadFile = ChatAdapter.defineTool({
  key: 'chat.file.upload',
  name: 'Upload File',
  description: 'Upload a file, optionally attaching it to a channel or thread.',
  input: z.object({
    channelId: z.string(),
    threadId: z.string().optional(),
    filename: z.string(),
    mimeType: z.string().optional(),
    content: z.string(),
    encoding: z.enum(['base64', 'utf-8'])
  }),
  output: z.object({
    attachment: attachmentRefSchema,
    message: messageSchema.optional()
  })
});

export let openModal = ChatAdapter.defineTool({
  key: 'chat.modal.open',
  name: 'Open Modal',
  description: 'Open a modal form. triggerId comes from an inbound action event.',
  input: z.object({
    triggerId: z.string(),
    modal: modalSchema,
    contextId: z.string().optional()
  }),
  output: z.object({
    viewId: z.string()
  })
});

export let startTyping = ChatAdapter.defineTool({
  key: 'chat.typing.start',
  name: 'Start Typing',
  description: 'Show a typing indicator in a channel or thread.',
  input: z.object({
    channelId: z.string(),
    threadId: z.string().optional(),
    status: z.string().optional()
  }),
  output: okSchema
});
