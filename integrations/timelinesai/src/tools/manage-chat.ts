import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageChat = SlateTool.create(spec, {
  name: 'Manage Chat',
  key: 'manage_chat',
  description: `Get details of a specific chat or update chat properties. Supports renaming the chat, assigning/unassigning a team member, closing/reopening, and marking as read/unread. Can also manage chat labels and add notes.`,
  instructions: [
    'To unassign a chat, set responsible to an empty string.',
    'To add labels without removing existing ones, set labelAction to "add". To replace all labels, set labelAction to "replace".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z.number().describe('Chat ID to manage'),
      name: z.string().optional().describe('New name for the chat (must be unique)'),
      responsible: z
        .string()
        .optional()
        .describe('Email of the team member to assign, or empty string to unassign'),
      closed: z
        .boolean()
        .optional()
        .describe('Set to true to close the chat, false to reopen'),
      read: z
        .boolean()
        .optional()
        .describe('Set to true to mark as read, false to mark as unread'),
      labels: z.array(z.string()).optional().describe('Labels to set on the chat'),
      labelAction: z
        .enum(['add', 'replace'])
        .optional()
        .describe(
          'Whether to add labels to existing ones or replace all labels. Defaults to "add".'
        ),
      noteText: z.string().optional().describe('Text for a note to add to the chat'),
      notePrivate: z
        .boolean()
        .optional()
        .describe('Whether the note is private (default: true)')
    })
  )
  .output(
    z.object({
      chatId: z.number().describe('Chat ID'),
      name: z.string().optional().describe('Chat name'),
      responsible: z.string().optional().describe('Assigned team member email'),
      isClosed: z.boolean().optional().describe('Whether the chat is closed'),
      isRead: z.boolean().optional().describe('Whether the chat is read'),
      labels: z.array(z.string()).optional().describe('Current labels on the chat'),
      noteMessageUid: z
        .string()
        .optional()
        .describe('UID of the added note (if a note was added)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      chatId,
      name,
      responsible,
      closed,
      read,
      labels,
      labelAction,
      noteText,
      notePrivate
    } = ctx.input;

    let hasUpdates =
      name !== undefined ||
      responsible !== undefined ||
      closed !== undefined ||
      read !== undefined;

    let chatData: any;
    if (hasUpdates) {
      let updatePayload: Record<string, any> = {};
      if (name !== undefined) updatePayload.name = name;
      if (responsible !== undefined) updatePayload.responsible = responsible;
      if (closed !== undefined) updatePayload.closed = closed;
      if (read !== undefined) updatePayload.read = read;
      let result = await client.updateChat(chatId, updatePayload);
      chatData = result?.data || result;
    } else {
      let result = await client.getChat(chatId);
      chatData = result?.data || result;
    }

    let currentLabels: string[] | undefined;
    if (labels && labels.length > 0) {
      let action = labelAction || 'add';
      let labelResult: any;
      if (action === 'replace') {
        labelResult = await client.replaceChatLabels(chatId, labels);
      } else {
        labelResult = await client.addChatLabels(chatId, labels);
      }
      currentLabels = labelResult?.data?.labels;
    }

    let noteMessageUid: string | undefined;
    if (noteText) {
      let noteResult = await client.addChatNote(chatId, {
        text: noteText,
        isPrivate: notePrivate
      });
      noteMessageUid = noteResult?.data?.message_uid;
    }

    let actions: string[] = [];
    if (hasUpdates) actions.push('updated');
    if (labels && labels.length > 0) actions.push('labels modified');
    if (noteText) actions.push('note added');
    if (actions.length === 0) actions.push('retrieved');

    return {
      output: {
        chatId,
        name: chatData?.name,
        responsible: chatData?.responsible,
        isClosed: chatData?.closed,
        isRead: chatData?.read,
        labels: currentLabels || chatData?.labels,
        noteMessageUid
      },
      message: `Chat **${chatId}** ${actions.join(', ')} successfully.`
    };
  })
  .build();
