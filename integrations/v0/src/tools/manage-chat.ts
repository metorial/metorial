import { SlateTool } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z.string().describe('Message role (user, assistant, system)'),
  content: z.string().optional().describe('Message text content'),
  createdAt: z.string().optional().describe('Message timestamp'),
  type: z.string().optional().describe('Message type indicator')
});

let chatDetailSchema = z.object({
  chatId: z.string().describe('Unique chat identifier'),
  name: z.string().optional().describe('Chat name'),
  privacy: z.string().describe('Chat visibility level'),
  favorite: z.boolean().optional().describe('Whether the chat is favorited'),
  createdAt: z.string().describe('ISO timestamp of creation'),
  updatedAt: z.string().optional().describe('ISO timestamp of last update'),
  authorId: z.string().optional().describe('Creator user ID'),
  projectId: z.string().optional().describe('Associated project ID'),
  webUrl: z.string().describe('URL to view the chat'),
  apiUrl: z.string().describe('API endpoint URL'),
  latestVersionId: z.string().optional().describe('Latest version ID'),
  latestVersionStatus: z.string().optional().describe('Latest version status'),
  demoUrl: z.string().optional().describe('Demo URL for the latest version'),
  messages: z.array(messageSchema).optional().describe('Chat message history')
});

export let listChatsTool = SlateTool.create(spec, {
  name: 'List Chats',
  key: 'list_chats',
  description: `Retrieve a list of chats with pagination and filtering support. Filter by favorite status, Vercel project, or Git branch.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max number of chats to return'),
      offset: z.number().optional().describe('Pagination offset'),
      isFavorite: z.boolean().optional().describe('Filter by favorite status'),
      vercelProjectId: z.string().optional().describe('Filter by Vercel project ID'),
      branch: z.string().optional().describe('Filter by Git branch name')
    })
  )
  .output(
    z.object({
      chats: z
        .array(
          z.object({
            chatId: z.string().describe('Chat identifier'),
            name: z.string().optional().describe('Chat name'),
            privacy: z.string().describe('Privacy setting'),
            favorite: z.boolean().optional().describe('Favorite status'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp'),
            projectId: z.string().optional().describe('Associated project ID'),
            webUrl: z.string().describe('Web URL'),
            latestVersionId: z.string().optional().describe('Latest version ID'),
            latestVersionStatus: z.string().optional().describe('Latest version status'),
            demoUrl: z.string().optional().describe('Demo URL')
          })
        )
        .describe('List of chats')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.listChats(ctx.input);

    let chats = (result.data || []).map((c: any) => ({
      chatId: c.id,
      name: c.name,
      privacy: c.privacy,
      favorite: c.favorite,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      projectId: c.projectId,
      webUrl: c.webUrl,
      latestVersionId: c.latestVersion?.id,
      latestVersionStatus: c.latestVersion?.status,
      demoUrl: c.latestVersion?.demoUrl
    }));

    return {
      output: { chats },
      message: `Found **${chats.length}** chat(s).`
    };
  })
  .build();

export let getChatTool = SlateTool.create(spec, {
  name: 'Get Chat',
  key: 'get_chat',
  description: `Retrieve full details of a specific chat including its message history, latest version status, and associated metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      chatId: z.string().describe('The chat ID to retrieve')
    })
  )
  .output(chatDetailSchema)
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.getChat(ctx.input.chatId);

    let messages = (result.messages || []).map((m: any) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
      type: m.type
    }));

    return {
      output: {
        chatId: result.id,
        name: result.name,
        privacy: result.privacy,
        favorite: result.favorite,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        authorId: result.authorId,
        projectId: result.projectId,
        webUrl: result.webUrl,
        apiUrl: result.apiUrl,
        latestVersionId: result.latestVersion?.id,
        latestVersionStatus: result.latestVersion?.status,
        demoUrl: result.latestVersion?.demoUrl,
        messages
      },
      message: `Retrieved chat **${result.name || result.id}** with ${messages.length} message(s).`
    };
  })
  .build();

export let deleteChatTool = SlateTool.create(spec, {
  name: 'Delete Chat',
  key: 'delete_chat',
  description: `Permanently delete a chat and all its contents. This operation is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      chatId: z.string().describe('The chat ID to delete')
    })
  )
  .output(
    z.object({
      chatId: z.string().describe('ID of the deleted chat'),
      deleted: z.boolean().describe('Whether the chat was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    await client.deleteChat(ctx.input.chatId);

    return {
      output: {
        chatId: ctx.input.chatId,
        deleted: true
      },
      message: `Deleted chat ${ctx.input.chatId}.`
    };
  })
  .build();
