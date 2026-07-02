import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a WhatsApp text message to a contact or existing chat. Supports sending to a phone number, an existing chat by ID, a chat by name, or a JID. Optionally attach a previously uploaded file and assign a label to the chat.`,
  instructions: [
    'Provide either a phone number, chatId, chatName, or jid as the recipient.',
    'Phone numbers must be in international format (e.g., +1234567890).',
    'To attach a file, first upload it using the Upload File tool, then pass the returned fileUid.',
    'Use \\n for line breaks in message text.'
  ],
  constraints: [
    'Rate limited: messages are queued with a ~2 second delay between sends.',
    'Each text message consumes 1 messaging credit; text + attachment consumes 2 credits.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      phone: z
        .string()
        .optional()
        .describe('Recipient phone number in international format (e.g., +1234567890)'),
      chatId: z.number().optional().describe('Existing chat ID to send the message to'),
      chatName: z
        .string()
        .optional()
        .describe('Exact chat name in TimelinesAI to send the message to'),
      jid: z
        .string()
        .optional()
        .describe('WhatsApp JID identifier (e.g., 1234567890@s.whatsapp.net)'),
      whatsappAccountPhone: z
        .string()
        .optional()
        .describe(
          'Sender WhatsApp account phone in international format. If omitted, the default account is used.'
        ),
      text: z
        .string()
        .optional()
        .describe('Plain text message content. Use \\n for line breaks.'),
      fileUid: z.string().optional().describe('UID of a previously uploaded file to attach'),
      label: z.string().optional().describe('Label to assign to the chat'),
      replyTo: z
        .string()
        .optional()
        .describe('Message UID to reply to (only for chatId, chatName, or jid targets)')
    })
  )
  .output(
    z.object({
      messageUid: z.string().describe('UID of the sent message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { phone, chatId, chatName, jid, whatsappAccountPhone, text, fileUid, label, replyTo } =
      ctx.input;

    let result: any;

    if (chatId) {
      result = await client.sendMessageToChat(chatId, { text, fileUid, label, replyTo });
    } else if (phone) {
      result = await client.sendMessageToPhone({
        phone,
        whatsappAccountPhone,
        text,
        fileUid,
        label
      });
    } else if (chatName) {
      result = await client.sendMessageToChatName({
        chatName,
        whatsappAccountPhone,
        text,
        fileUid,
        replyTo
      });
    } else if (jid) {
      result = await client.sendMessageToJid({
        jid,
        whatsappAccountPhone,
        text,
        fileUid,
        label,
        replyTo
      });
    } else {
      throw new Error('One of phone, chatId, chatName, or jid must be provided');
    }

    let messageUid = result?.data?.message_uid || result?.message_uid || '';

    return {
      output: { messageUid },
      message: `Message sent successfully. Message UID: **${messageUid}**`
    };
  })
  .build();
