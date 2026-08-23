import { z } from 'zod';
import { ChatAdapter } from './adapter';
import { authorSchema } from './schema/channels/author';
import { channelSchema, channelTypeSchema } from './schema/channels/channel';
import { threadSchema, threadTypeSchema } from './schema/channels/thread';
import { workspaceSchema } from './schema/channels/workspace';
import { attachmentRefSchema } from './schema/content/attachment';
import { chatBodySchema } from './schema/content/body';
import { messageResultSchema, messageSchema, replyRefSchema } from './schema/content/message';
import { commandSchema } from './schema/interactions/command';
import { modalSchema } from './schema/interactions/modal';
import { cursorPageResultSchema, cursorPageSchema } from './schema/shared/cursor';
import { emojiInputSchema } from './schema/shared/emoji';
import { rawSchema } from './schema/shared/raw';
import { reactionCountSchema } from './schema/shared/reaction';
import { chatSetupInputSchema, chatSetupOutputSchema } from './schema/shared/setup';

let okSchema = z.object({
  ok: z.boolean(),
  raw: rawSchema
});

export let sendMessage = ChatAdapter.defineTool({
  key: 'metorial_chat$message.send',
  name: 'Send Message',
  description:
    'Send a message to a channel or thread as a parts document (markdown, text, cards, and attachments).',
  input: chatBodySchema.extend({
    channelId: z.string().describe('Channel to send the message to'),
    threadId: z.string().optional().describe('Thread id when posting a reply in a thread'),
    reply: replyRefSchema
      .optional()
      .describe(
        'Quote or reply target. If neither id nor reference is set, this is a normal message.'
      ),
    ephemeral: z
      .boolean()
      .optional()
      .describe('If true, only targetUserId can see the message'),
    targetUserId: z.string().optional().describe('Required when ephemeral is true')
  }),
  output: messageResultSchema
});

export let editMessage = ChatAdapter.defineTool({
  key: 'metorial_chat$message.edit',
  name: 'Edit Message',
  description: 'Replace the body of an existing message.',
  input: chatBodySchema.extend({
    channelId: z.string(),
    messageId: z.string()
  }),
  output: messageResultSchema
});

export let deleteMessage = ChatAdapter.defineTool({
  key: 'metorial_chat$message.delete',
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
  key: 'metorial_chat$message.get',
  name: 'Get Message',
  description: 'Fetch a single message by id.',
  tags: { readOnly: true },
  input: z.object({
    channelId: z.string(),
    messageId: z.string()
  }),
  output: messageResultSchema
});

export let listMessages = ChatAdapter.defineTool({
  key: 'metorial_chat$message.list',
  name: 'List Messages',
  description:
    'List messages in a channel or thread. Each page is chronological (oldest first). Default direction is backward (older). nextCursor continues in that direction; prevCursor pages the other way when the platform supports it.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    channelId: z.string(),
    threadId: z.string().optional()
  }),
  output: cursorPageResultSchema.extend({
    messages: z.array(messageSchema),
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let searchMessages = ChatAdapter.defineTool({
  key: 'metorial_chat$message.search',
  name: 'Search Messages',
  description: 'Search messages by query, optionally scoped to a channel.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    query: z.string(),
    channelId: z.string().optional()
  }),
  output: cursorPageResultSchema.extend({
    messages: z.array(messageSchema),
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let sendEphemeralMessage = ChatAdapter.defineTool({
  key: 'metorial_chat$message.sendEphemeral',
  name: 'Send Ephemeral Message',
  description: 'Send a message visible only to one user. Providers may fall back to a DM.',
  input: chatBodySchema.extend({
    channelId: z.string(),
    userId: z.string(),
    threadId: z.string().optional()
  }),
  output: messageResultSchema.extend({
    usedFallback: z.boolean()
  })
});

export let markMessageRead = ChatAdapter.defineTool({
  key: 'metorial_chat$message.markRead',
  name: 'Mark Message Read',
  description: 'Send a read receipt for a message.',
  input: z.object({
    channelId: z.string(),
    messageId: z.string(),
    threadId: z.string().optional()
  }),
  output: okSchema
});

export let addReaction = ChatAdapter.defineTool({
  key: 'metorial_chat$reaction.add',
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
  key: 'metorial_chat$reaction.remove',
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
  key: 'metorial_chat$reaction.list',
  name: 'List Reactions',
  description: 'List reactions on a message.',
  tags: { readOnly: true },
  input: z.object({
    channelId: z.string(),
    messageId: z.string()
  }),
  output: z.object({
    reactions: z.array(reactionCountSchema),
    raw: rawSchema
  })
});

export let listChannels = ChatAdapter.defineTool({
  key: 'metorial_chat$channel.list',
  name: 'List Channels',
  description: 'List channels the bot can see.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    workspaceId: z.string().optional().describe('Limit to channels in this workspace'),
    type: channelTypeSchema.optional(),
    query: z.string().optional()
  }),
  output: cursorPageResultSchema.extend({
    channels: z.array(channelSchema),
    raw: rawSchema
  })
});

export let getChannel = ChatAdapter.defineTool({
  key: 'metorial_chat$channel.get',
  name: 'Get Channel',
  description: 'Fetch channel metadata.',
  tags: { readOnly: true },
  input: z.object({
    channelId: z.string()
  }),
  output: z.object({
    channel: channelSchema,
    raw: rawSchema
  })
});

export let listWorkspaces = ChatAdapter.defineTool({
  key: 'metorial_chat$workspace.list',
  name: 'List Workspaces',
  description: 'List workspaces the bot can see.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    query: z.string().optional()
  }),
  output: cursorPageResultSchema.extend({
    workspaces: z.array(workspaceSchema),
    raw: rawSchema
  })
});

export let getWorkspace = ChatAdapter.defineTool({
  key: 'metorial_chat$workspace.get',
  name: 'Get Workspace',
  description: 'Fetch workspace metadata.',
  tags: { readOnly: true },
  input: z.object({
    workspaceId: z.string()
  }),
  output: z.object({
    workspace: workspaceSchema,
    raw: rawSchema
  })
});

export let listChannelMembers = ChatAdapter.defineTool({
  key: 'metorial_chat$channel.members',
  name: 'List Channel Members',
  description: 'List members of a channel.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    channelId: z.string()
  }),
  output: cursorPageResultSchema.extend({
    authors: z.array(authorSchema),
    channel: channelSchema.optional(),
    raw: rawSchema
  })
});

export let listThreads = ChatAdapter.defineTool({
  key: 'metorial_chat$thread.list',
  name: 'List Threads',
  description: 'List threads in a channel.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    channelId: z.string(),
    type: threadTypeSchema.optional()
  }),
  output: cursorPageResultSchema.extend({
    threads: z.array(threadSchema),
    channel: channelSchema.optional(),
    raw: rawSchema
  })
});

export let getThread = ChatAdapter.defineTool({
  key: 'metorial_chat$thread.get',
  name: 'Get Thread',
  description: 'Fetch thread metadata.',
  tags: { readOnly: true },
  input: z.object({
    channelId: z.string(),
    threadId: z.string()
  }),
  output: z.object({
    thread: threadSchema,
    channel: channelSchema.optional(),
    raw: rawSchema
  })
});

let dmResultSchema = z.object({
  channel: channelSchema,
  raw: rawSchema
});

export let openSingleDm = ChatAdapter.defineTool({
  key: 'metorial_chat$dm.openSingle',
  name: 'Open Direct Message',
  description: 'Open or fetch a 1:1 direct message conversation with a user.',
  input: z.object({
    userId: z.string().describe('User to open a DM with')
  }),
  output: dmResultSchema
});

export let openGroupDm = ChatAdapter.defineTool({
  key: 'metorial_chat$dm.openGroup',
  name: 'Open Group Direct Message',
  description:
    'Open or fetch a group direct message conversation with multiple users. Use chat.dm.openSingle for a 1:1 DM.',
  input: z.object({
    userIds: z
      .array(z.string())
      .min(2)
      .describe('Users to include in the group DM. Must contain at least two user ids.')
  }),
  output: dmResultSchema
});

export let getUser = ChatAdapter.defineTool({
  key: 'metorial_chat$user.get',
  name: 'Get User',
  description: 'Look up a user by id.',
  tags: { readOnly: true },
  input: z.object({
    userId: z.string()
  }),
  output: z.object({
    author: authorSchema,
    raw: rawSchema
  })
});

export let getAuthenticatedUser = ChatAdapter.defineTool({
  key: 'metorial_chat$user.getAuthenticated',
  name: 'Get Authenticated User',
  description:
    'Return the user or app connected to this chat integration. Includes the workspace when the provider exposes it.',
  tags: { readOnly: true },
  input: z.object({}),
  output: z.object({
    author: authorSchema,
    workspace: workspaceSchema.optional(),
    raw: rawSchema
  })
});

export let searchUsers = ChatAdapter.defineTool({
  key: 'metorial_chat$user.search',
  name: 'Search Users',
  description: 'Search users by name or handle.',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    query: z.string()
  }),
  output: cursorPageResultSchema.extend({
    authors: z.array(authorSchema),
    raw: rawSchema
  })
});

export let uploadFile = ChatAdapter.defineTool({
  key: 'metorial_chat$file.upload',
  name: 'Upload File',
  description: 'Upload a file, optionally attaching it to a channel or thread.',
  input: z.object({
    channelId: z.string(),
    threadId: z.string().optional(),
    filename: z.string(),
    mimeType: z.string().optional(),
    fileUrl: z.string().url().describe('Short-lived signed URL to fetch the file bytes from'),
    fileSize: z.number().optional(),
    clientReferenceId: z
      .string()
      .optional()
      .describe('Passed through to the resulting attachment.clientReferenceId')
  }),
  output: z.object({
    attachment: attachmentRefSchema,
    // `message` is meaningfully used: for providers where uploading a file IS
    // itself a full message-send (e.g. Telegram's sendDocument/sendPhoto), this
    // field carries that newly-created message; for providers with a real
    // separate upload step (Slack) or a no-op upload (Discord -- see
    // docs/file-uploads.md), it stays undefined.
    message: messageSchema.optional(),
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let downloadFile = ChatAdapter.defineTool({
  key: 'metorial_chat$file.download',
  name: 'Download File',
  description:
    'Download an attachment. Pass the providerFileReference from a message attachment.',
  tags: { readOnly: true },
  input: z.object({
    providerFileReference: z.unknown()
  }),
  output: z.object({
    attachment: attachmentRefSchema,
    raw: rawSchema
  })
});

export let openModal = ChatAdapter.defineTool({
  key: 'metorial_chat$modal.open',
  name: 'Open Modal',
  description:
    'Open a modal form. triggerId comes from an inbound action or slash command event.',
  input: z.object({
    triggerId: z.string(),
    modal: modalSchema,
    contextId: z.string().optional()
  }),
  output: z.object({
    viewId: z.string(),
    raw: rawSchema
  })
});

export let respondToCommand = ChatAdapter.defineTool({
  key: 'metorial_chat$command.respond',
  name: 'Respond to Command',
  description:
    'Reply to a slash command invocation. Pass responseToken from chat.command.invoked so providers that require an interaction callback can respond correctly.',
  input: chatBodySchema.extend({
    responseToken: z
      .string()
      .describe('Opaque handle from chat.command.invoked for this invocation'),
    channelId: z.string().optional(),
    threadId: z.string().optional(),
    ephemeral: z
      .boolean()
      .optional()
      .describe('If true, only the invoking user can see the response')
  }),
  output: z.object({
    message: messageSchema.optional(),
    channel: channelSchema.optional(),
    thread: threadSchema.optional(),
    raw: rawSchema
  })
});

export let listCommands = ChatAdapter.defineTool({
  key: 'metorial_chat$command.list',
  name: 'List Commands',
  description:
    'List slash commands registered for this app. Omit this tool when the provider cannot introspect commands (Slack, Teams, Google Chat).',
  tags: { readOnly: true },
  input: cursorPageSchema.extend({
    workspaceId: z
      .string()
      .optional()
      .describe(
        'Limit to workspace/guild commands when the platform supports per-workspace commands'
      ),
    query: z.string().optional()
  }),
  output: cursorPageResultSchema.extend({
    commands: z.array(commandSchema),
    raw: rawSchema
  })
});

export let startTyping = ChatAdapter.defineTool({
  key: 'metorial_chat$typing.start',
  name: 'Start Typing',
  description: 'Show a typing indicator in a channel or thread.',
  input: z.object({
    channelId: z.string(),
    threadId: z.string().optional(),
    status: z.string().optional()
  }),
  output: okSchema
});

export let getSetup = ChatAdapter.definePublicTool({
  key: 'metorial_chat$setup.get',
  name: 'Get Setup Info',
  description:
    'Return provider-specific setup instructions for this chat app. Call before authentication. Pass the webhook URL, OAuth redirect URIs, and slash commands the host will serve so the provider can generate Markdown instructions and, when supported, an importable app manifest (for example a Slack app manifest).',
  tags: { readOnly: true },
  input: chatSetupInputSchema,
  output: chatSetupOutputSchema
});

export let chatTools = {
  sendMessage,
  editMessage,
  deleteMessage,
  getMessage,
  listMessages,
  searchMessages,
  sendEphemeralMessage,
  markMessageRead,
  addReaction,
  removeReaction,
  listReactions,
  listChannels,
  getChannel,
  listWorkspaces,
  getWorkspace,
  listChannelMembers,
  listThreads,
  getThread,
  openSingleDm,
  openGroupDm,
  getUser,
  getAuthenticatedUser,
  searchUsers,
  uploadFile,
  downloadFile,
  openModal,
  respondToCommand,
  listCommands,
  startTyping,
  getSetup
} as const;
