import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import {
  resolveGoogleChatSpaceName,
  resolveGoogleChatThreadName
} from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';

export type GoogleChatUser = {
  name?: string;
  displayName?: string;
  email?: string;
  type?: string;
};

export type GoogleChatAttachment = {
  name?: string;
  contentName?: string;
  contentType?: string;
  source?: string;
  attachmentDataRef?: {
    resourceName?: string;
  };
  driveDataRef?: {
    driveFileId?: string;
  };
};

export type GoogleChatMessage = {
  name?: string;
  sender?: GoogleChatUser;
  createTime?: string;
  lastUpdateTime?: string;
  deleteTime?: string;
  text?: string;
  formattedText?: string;
  thread?: {
    name?: string;
    threadKey?: string;
  };
  space?: {
    name?: string;
    displayName?: string;
    spaceType?: string;
  };
  attachment?: GoogleChatAttachment[];
  threadReply?: boolean;
  clientAssignedMessageId?: string;
  emojiReactionSummaries?: Array<{
    emoji?: {
      unicode?: string;
      customEmoji?: {
        uid?: string;
        name?: string;
      };
    };
    reactionCount?: number;
  }>;
};

let googleChatUserOutputSchema = z.object({
  userId: z.string().optional().describe('Google Chat user resource name'),
  displayName: z.string().optional().describe('Display name of the sender'),
  email: z.string().optional().describe('Email address of a human sender, when available'),
  userType: z.string().optional().describe('Google Chat user type')
});

let googleChatAttachmentOutputSchema = z.object({
  attachmentId: z.string().optional().describe('Attachment resource name or stable ID'),
  filename: z.string().optional().describe('Attachment file name'),
  mimeType: z.string().optional().describe('Attachment MIME type'),
  source: z.string().optional().describe('Attachment source'),
  resourceName: z
    .string()
    .optional()
    .describe('Uploaded attachment data resource name, when available')
});

let googleChatReactionSummaryOutputSchema = z.object({
  emoji: z.string().optional().describe('Unicode emoji or custom emoji identifier'),
  count: z.number().int().nonnegative().describe('Number of reactions using this emoji')
});

export let googleChatMessageOutputSchema = z.object({
  messageId: z.string().describe('Full Google Chat message resource name'),
  spaceName: z.string().optional().describe('Full Google Chat space resource name'),
  threadId: z.string().optional().describe('Full Google Chat thread resource name'),
  threadKey: z.string().optional().describe('Application-defined thread key'),
  plaintextBody: z.string().describe('Plain-text body of the message'),
  formattedBody: z.string().optional().describe('Message text with Google Chat formatting'),
  sender: googleChatUserOutputSchema.optional().describe('Message sender'),
  createTime: z.string().optional().describe('Message creation timestamp'),
  lastUpdateTime: z.string().optional().describe('Last message update timestamp'),
  deleteTime: z.string().optional().describe('Message deletion timestamp'),
  threadedReply: z.boolean().describe('Whether the message is a threaded reply'),
  clientAssignedMessageId: z
    .string()
    .optional()
    .describe('Client-assigned message ID, when one was used'),
  attachments: z
    .array(googleChatAttachmentOutputSchema)
    .describe('Attachments included in the message'),
  reactionSummaries: z
    .array(googleChatReactionSummaryOutputSchema)
    .describe('Emoji reaction summaries for the message')
});

let inferSpaceName = (messageName: string) => {
  let match = /^(spaces\/[^/]+)\/messages\/[^/]+$/.exec(messageName);
  return match?.[1];
};

export let mapGoogleChatMessage = (message: GoogleChatMessage) => {
  let messageId = message.name?.trim();
  if (!messageId) {
    throw googleChatValidationError(
      'Google Chat returned a message without its required resource name.'
    );
  }

  return {
    messageId,
    spaceName: message.space?.name ?? inferSpaceName(messageId),
    threadId: message.thread?.name,
    threadKey: message.thread?.threadKey,
    plaintextBody: message.text ?? '',
    formattedBody: message.formattedText,
    sender: message.sender
      ? {
          userId: message.sender.name,
          displayName: message.sender.displayName,
          email: message.sender.email,
          userType: message.sender.type
        }
      : undefined,
    createTime: message.createTime,
    lastUpdateTime: message.lastUpdateTime,
    deleteTime: message.deleteTime,
    threadedReply: message.threadReply ?? false,
    clientAssignedMessageId: message.clientAssignedMessageId,
    attachments: (message.attachment ?? []).map(attachment => ({
      attachmentId:
        attachment.name ??
        attachment.attachmentDataRef?.resourceName ??
        attachment.driveDataRef?.driveFileId,
      filename: attachment.contentName,
      mimeType: attachment.contentType,
      source: attachment.source,
      resourceName: attachment.attachmentDataRef?.resourceName
    })),
    reactionSummaries: (message.emojiReactionSummaries ?? []).map(summary => ({
      emoji:
        summary.emoji?.unicode ??
        summary.emoji?.customEmoji?.name ??
        summary.emoji?.customEmoji?.uid,
      count: summary.reactionCount ?? 0
    }))
  };
};

export type SendMessageInput = {
  conversationId?: string;
  messageText: string;
  threadId?: string;
  threadKey?: string;
  messageReplyOption?:
    | 'MESSAGE_REPLY_OPTION_UNSPECIFIED'
    | 'REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD'
    | 'REPLY_MESSAGE_OR_FAIL';
  attachmentResourceNames?: string[];
  attachmentUploadTokens?: string[];
};

let resolveAttachmentValues = (values: string[] | undefined, label: string) =>
  values?.map(value => {
    let resolved = value.trim();
    if (!resolved) throw googleChatValidationError(`${label} cannot contain empty values.`);
    return resolved;
  });

export let buildSendMessageRequest = (input: SendMessageInput, defaultSpace?: string) => {
  let parent = resolveGoogleChatSpaceName(input.conversationId, defaultSpace);
  let threadName = resolveGoogleChatThreadName(input.threadId, parent);
  let threadKey = input.threadKey?.trim();
  let replyOption = input.messageReplyOption;

  if (input.threadKey !== undefined && !threadKey) {
    throw googleChatValidationError('threadKey cannot be empty.');
  }

  if (threadName && threadKey) {
    throw googleChatValidationError('threadId and threadKey cannot be used together.');
  }

  if (
    replyOption &&
    replyOption !== 'MESSAGE_REPLY_OPTION_UNSPECIFIED' &&
    !threadName &&
    !threadKey
  ) {
    throw googleChatValidationError(
      'threadId or threadKey is required when messageReplyOption requests a threaded reply.'
    );
  }

  if ((threadName || threadKey) && !replyOption) {
    replyOption = 'REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD';
  }

  let attachmentResourceNames = resolveAttachmentValues(
    input.attachmentResourceNames,
    'attachmentResourceNames'
  );
  let attachmentUploadTokens = resolveAttachmentValues(
    input.attachmentUploadTokens,
    'attachmentUploadTokens'
  );

  if (attachmentResourceNames && attachmentUploadTokens) {
    throw googleChatValidationError(
      'attachmentResourceNames and attachmentUploadTokens cannot be used together.'
    );
  }

  let attachments = attachmentUploadTokens?.length
    ? attachmentUploadTokens.map(attachmentUploadToken => ({
        attachmentDataRef: { attachmentUploadToken }
      }))
    : attachmentResourceNames?.length
      ? attachmentResourceNames.map(resourceName => ({
          attachmentDataRef: { resourceName }
        }))
      : undefined;

  return {
    parent,
    data: {
      text: input.messageText,
      ...(threadName ? { thread: { name: threadName } } : {}),
      ...(threadKey ? { thread: { threadKey } } : {}),
      ...(attachments ? { attachment: attachments } : {})
    },
    params: pickDefined({ messageReplyOption: replyOption })
  };
};

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description:
    'Send a Markdown-formatted text message to a Google Chat conversation. Optionally reply to an existing thread by resource name or start or reply to an application-owned thread using a thread key.',
  instructions: [
    'Use search_conversations to find a conversationId when it is not already known.',
    'When threadId or threadKey is supplied without messageReplyOption, the tool defaults to REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD.',
    'Combine messageReplyOption=MESSAGE_REPLY_OPTION_UNSPECIFIED with threadKey to always start a new thread under that key instead of replying.',
    'Use attachmentUploadTokens with the attachmentUploadToken values returned by upload_attachment.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleChatActionScopes.sendMessage)
  .authMethods(googleChatActionAuthMethods.sendMessage)
  .input(
    z.object({
      conversationId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Conversation resource name (spaces/{space}); uses configured defaultSpace when omitted'
        ),
      messageText: z
        .string()
        .min(1)
        .describe('Main message text with Google Chat Markdown formatting'),
      threadId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Existing thread ID or spaces/{space}/threads/{thread} resource name; cannot be combined with threadKey'
        ),
      threadKey: z
        .string()
        .trim()
        .min(1)
        .max(4000)
        .optional()
        .describe(
          'Application-defined thread key to start or reply to a thread; cannot be combined with threadId'
        ),
      messageReplyOption: z
        .enum([
          'MESSAGE_REPLY_OPTION_UNSPECIFIED',
          'REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD',
          'REPLY_MESSAGE_OR_FAIL'
        ])
        .optional()
        .describe(
          'Threading behavior: MESSAGE_REPLY_OPTION_UNSPECIFIED (default) starts a new thread, optionally keyed by threadKey; REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD replies to the referenced thread or starts a new one when it is missing; REPLY_MESSAGE_OR_FAIL replies or fails when the thread does not exist'
        ),
      attachmentResourceNames: z
        .array(z.string().trim().min(1))
        .max(10)
        .optional()
        .describe(
          'Attachment data resource names to include; cannot be combined with attachmentUploadTokens'
        ),
      attachmentUploadTokens: z
        .array(z.string().trim().min(1))
        .max(10)
        .optional()
        .describe(
          'Opaque attachment upload tokens returned by upload_attachment; cannot be combined with attachmentResourceNames'
        )
    })
  )
  .output(
    z.object({
      message: googleChatMessageOutputSchema.describe('The message created by Google Chat')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildSendMessageRequest(ctx.input, ctx.config.defaultSpace);
    let client = new GoogleChatClient(ctx.auth.token);
    let message = await client.request<GoogleChatMessage>(`${request.parent}/messages`, {
      method: 'post',
      params: request.params,
      data: request.data,
      operation: 'send message'
    });
    let mapped = mapGoogleChatMessage(message);

    return {
      output: { message: mapped },
      message: `Sent message \`${mapped.messageId}\` to \`${request.parent}\`.`
    };
  })
  .build();
