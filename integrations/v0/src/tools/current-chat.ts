import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  currentChatSchema,
  currentMessageSchema,
  generationSchema,
  metadataSchema,
  privacySchema,
  usageSchema,
  V0CurrentClient
} from '../lib/v2-client';
import { spec } from '../spec';

const chatIdSchema = z.object({
  chatId: z.string().min(1).describe('API v2 chat ID; v1 chat IDs are incompatible')
});
const chatOptions = z.object({
  title: z.string().optional().describe('Chat title'),
  privacy: privacySchema.optional().describe('Visibility; defaults to private for new chats'),
  metadata: metadataSchema.optional().describe('Metadata used for grouping and discovery')
});
const page = z.object({
  limit: z.number().int().min(1).max(100).optional().describe('Maximum items, from 1 to 100'),
  cursor: z.string().optional().describe('Cursor from the previous result')
});
const instructions = [
  'Uses the current v0 API v2. Existing v1 chats must be migrated by downloading a version and importing its files into a new chat.',
  'Generation consumes v0 credits. Connected MCP servers are disabled for generation requests.'
];

export const createCurrentChatTool = SlateTool.create(spec, {
  name: 'Create Current Chat',
  key: 'create_current_chat',
  description:
    'Generate an application in a new v0 API v2 chat. Returns IDs for polling asynchronous generation or the completed chat.',
  instructions: [
    ...instructions,
    'New generated chats disable shared npm, GitHub, and Vercel credentials.'
  ]
})
  .input(generationSchema.extend(chatOptions.shape))
  .output(
    z.object({
      chatId: z.string(),
      messageId: z.string().optional(),
      chat: currentChatSchema.optional(),
      usage: usageSchema.optional()
    })
  )
  .handleInvocation(async ctx => ({
    output: await new V0CurrentClient(ctx.auth.token).create(ctx.input),
    message: 'Created the v0 chat.'
  }))
  .build();

export const importCurrentChatTool = SlateTool.create(spec, {
  name: 'Import Current Chat',
  key: 'import_current_chat',
  description:
    'Initialize a v0 API v2 chat with existing source files, without prompting code generation.',
  instructions: [instructions[0]!]
})
  .input(
    chatOptions.extend({
      files: z
        .array(
          z.object({
            name: z.string().min(1).describe('Project-relative file path'),
            content: z.string().describe('Source file contents'),
            encoding: z
              .enum(['utf8', 'base64'])
              .optional()
              .describe('Defaults to UTF-8; use base64 for binary files')
          })
        )
        .min(1)
        .max(100)
        .describe('Source files to import')
    })
  )
  .output(z.object({ chat: currentChatSchema, usage: usageSchema }))
  .handleInvocation(async ctx => ({
    output: await new V0CurrentClient(ctx.auth.token).importFiles(ctx.input),
    message: 'Imported the source files into a new v0 chat.'
  }))
  .build();

export const listCurrentChatsTool = SlateTool.create(spec, {
  name: 'List Current Chats',
  key: 'list_current_chats',
  description:
    'Discover v0 API v2 chats with cursor pagination and metadata, author, or Vercel project filters.',
  tags: { readOnly: true }
})
  .input(
    page.extend({
      authorId: z
        .string()
        .optional()
        .describe('Filter by an author in the active account or team'),
      vercelProjectId: z.string().optional().describe('Filter by the attached Vercel project'),
      metadata: metadataSchema.optional().describe('Match metadata key-value pairs')
    })
  )
  .output(z.object({ chats: z.array(currentChatSchema), cursor: z.string().nullable() }))
  .handleInvocation(async ctx => ({
    output: await new V0CurrentClient(ctx.auth.token).list(ctx.input),
    message: 'Retrieved current v0 chats.'
  }))
  .build();

export const getCurrentChatTool = SlateTool.create(spec, {
  name: 'Get Current Chat',
  key: 'get_current_chat',
  description:
    'Read a v0 API v2 chat, including metadata, privacy, and write access. Use list_current_messages for conversation history.',
  tags: { readOnly: true }
})
  .input(chatIdSchema)
  .output(currentChatSchema)
  .handleInvocation(async ctx => ({
    output: await new V0CurrentClient(ctx.auth.token).get(ctx.input.chatId),
    message: 'Retrieved the current v0 chat.'
  }))
  .build();

export const updateCurrentChatTool = SlateTool.create(spec, {
  name: 'Update Current Chat',
  key: 'update_current_chat',
  description: 'Update the title, privacy, or grouping metadata of a v0 API v2 chat.'
})
  .input(chatIdSchema.extend(chatOptions.shape))
  .output(currentChatSchema)
  .handleInvocation(async ctx => {
    const { chatId, ...body } = ctx.input;
    return {
      output: await new V0CurrentClient(ctx.auth.token).update(chatId, body),
      message: 'Updated the current v0 chat.'
    };
  })
  .build();

export const deleteCurrentChatTool = SlateTool.create(spec, {
  name: 'Delete Current Chat',
  key: 'delete_current_chat',
  description: 'Permanently delete a v0 API v2 chat and its source workspace.',
  tags: { destructive: true }
})
  .input(chatIdSchema)
  .output(z.object({ chatId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => ({
    output: {
      ...(await new V0CurrentClient(ctx.auth.token).delete(ctx.input.chatId)),
      deleted: true
    },
    message: 'Deleted the current v0 chat.'
  }))
  .build();

export const sendCurrentMessageTool = SlateTool.create(spec, {
  name: 'Send Current Message',
  key: 'send_current_message',
  description:
    'Continue generating or refining an application in a v0 API v2 chat. Async requests return a message ID for polling.',
  instructions: [
    ...instructions,
    'Continuation retains the existing chat’s credential access configuration; use only a chat authorized for the requested work.'
  ]
})
  .input(chatIdSchema.extend(generationSchema.shape))
  .output(
    z.object({
      chatId: z.string(),
      messageId: z.string(),
      message: currentMessageSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const { chatId, ...body } = ctx.input;
    return {
      output: { chatId, ...(await new V0CurrentClient(ctx.auth.token).send(chatId, body)) },
      message: 'Sent the message to v0.'
    };
  })
  .build();

export const listCurrentMessagesTool = SlateTool.create(spec, {
  name: 'List Current Messages',
  key: 'list_current_messages',
  description:
    'Read message text, completion status, and credit usage in a v0 API v2 chat with cursor pagination.',
  tags: { readOnly: true }
})
  .input(chatIdSchema.extend(page.shape))
  .output(z.object({ messages: z.array(currentMessageSchema), cursor: z.string().nullable() }))
  .handleInvocation(async ctx => {
    const { chatId, ...params } = ctx.input;
    return {
      output: await new V0CurrentClient(ctx.auth.token).listMessages(chatId, params),
      message: 'Retrieved current chat messages.'
    };
  })
  .build();

export const getCurrentMessageTool = SlateTool.create(spec, {
  name: 'Get Current Message',
  key: 'get_current_message',
  description:
    'Poll an asynchronous v0 API v2 message. A non-null finishReason indicates completion; error indicates failed generation.',
  tags: { readOnly: true }
})
  .input(
    chatIdSchema.extend({
      messageId: z
        .string()
        .min(1)
        .describe('Message ID returned by generation or message discovery')
    })
  )
  .output(currentMessageSchema)
  .handleInvocation(async ctx => ({
    output: await new V0CurrentClient(ctx.auth.token).getMessage(
      ctx.input.chatId,
      ctx.input.messageId
    ),
    message: 'Retrieved the current chat message.'
  }))
  .build();

export const downloadCurrentFilesTool = SlateTool.create(spec, {
  name: 'Download Current Chat Files',
  key: 'download_current_files',
  description: 'Download the complete source workspace of a v0 API v2 chat as a ZIP archive.',
  tags: { readOnly: true }
})
  .input(chatIdSchema)
  .output(z.object({ chatId: z.string(), fileName: z.string(), mimeType: z.string() }))
  .handleInvocation(async ctx => {
    await new V0CurrentClient(ctx.auth.token).get(ctx.input.chatId);
    const fileName = `v0-${ctx.input.chatId.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.v0.dev/v2/chats/${encodeURIComponent(ctx.input.chatId)}/files/download`,
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      mimeType: 'application/zip',
      filename: fileName
    });
    return {
      output: { chatId: ctx.input.chatId, fileName, mimeType: 'application/zip' },
      message: 'Prepared the source ZIP for download.'
    };
  })
  .build();

export const currentTools = [
  createCurrentChatTool,
  importCurrentChatTool,
  listCurrentChatsTool,
  getCurrentChatTool,
  updateCurrentChatTool,
  deleteCurrentChatTool,
  sendCurrentMessageTool,
  listCurrentMessagesTool,
  getCurrentMessageTool,
  downloadCurrentFilesTool
];
