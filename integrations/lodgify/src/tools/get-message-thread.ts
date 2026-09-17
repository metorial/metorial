import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

type ThreadAttachment = {
  file_name?: string | null;
  content_length?: string | number | null;
  content_type?: string | null;
  file_url?: string | null;
};

type ThreadMessage = {
  id?: number | null;
  subject?: string | null;
  message?: string | null;
  type?: string | null;
  date_created?: string | null;
  attachments?: ThreadAttachment[] | null;
  message_status?: string | null;
  is_read?: boolean | null;
  route?: string | null;
  message_id?: string | null;
};

type MessageThread = {
  thread_uid?: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  last_message_date?: string | null;
  is_read?: boolean | null;
  is_closed?: boolean | null;
  error_message?: string | null;
  error_title?: string | null;
  messages?: ThreadMessage[] | null;
};

// Lodgify answers this endpoint with a single thread object. A bare array is
// tolerated in case that ever changes, but an empty array means the thread does
// not exist and must not be reported as an empty conversation.
let normalizeThread = (response: unknown, threadUid: string): MessageThread => {
  let thread = Array.isArray(response) ? response[0] : response;

  if (!thread || typeof thread !== 'object') {
    throw createApiServiceError(
      `No message thread was found for thread ID "${threadUid}". Check the thread_uid on the booking or enquiry the conversation belongs to.`
    );
  }

  return thread as MessageThread;
};

export let getMessageThread = SlateTool.create(spec, {
  name: 'Get Message Thread',
  key: 'get_message_thread',
  description: `Read the full conversation history for a guest message thread. Returns every message in the thread with its sender, delivery status, the channel it travelled over, and any files attached to it, plus whether the thread is still open for replies. Use this to review what a guest has already been told before answering them.`,
  instructions: [
    'Thread IDs come from the thread_uid field on booking and enquiry details.',
    'Message bodies are HTML, not plain text.',
    'When isClosed is true, a reply will fail; errorTitle and errorMessage explain why.',
    'Check messageStatus on the most recent outgoing message to confirm an earlier send actually reached the guest.',
    'Use Send Message to reply to the booking or enquiry this thread belongs to.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      threadUid: z.string().describe('The unique ID (UUID) of the message thread to read')
    })
  )
  .output(
    z.object({
      threadUid: z.string().describe('The unique ID of the thread that was read'),
      guestName: z.string().optional().describe('Name of the guest in this conversation'),
      guestEmail: z
        .string()
        .optional()
        .describe('Email address of the guest in this conversation'),
      lastMessageDate: z
        .string()
        .optional()
        .describe('When the most recent message in the thread was sent'),
      isRead: z.boolean().optional().describe('Whether the thread has been read'),
      isClosed: z
        .boolean()
        .optional()
        .describe(
          'Whether the thread is closed to new replies. When true, sending a message to this conversation will fail and errorTitle/errorMessage explain the reason'
        ),
      errorTitle: z
        .string()
        .optional()
        .describe('Short reason the thread cannot accept replies, when it is closed'),
      errorMessage: z
        .string()
        .optional()
        .describe(
          'Full explanation of why the thread cannot accept replies, when it is closed'
        ),
      messageCount: z.number().describe('Number of messages returned in the thread'),
      messages: z
        .array(
          z.object({
            id: z.number().optional().describe('Identifier of the message'),
            messageId: z.string().optional().describe('Idempotent identifier of the message'),
            subject: z.string().optional().describe('Subject line of the message'),
            message: z.string().optional().describe('Body of the message, as HTML'),
            type: z
              .string()
              .optional()
              .describe(
                'Who the message came from: "Owner" for messages you sent, "Renter" for messages from the guest'
              ),
            dateCreated: z.string().optional().describe('When the message was created'),
            isRead: z.boolean().optional().describe('Whether this message has been read'),
            messageStatus: z
              .string()
              .optional()
              .describe(
                'Delivery state of the message: "Submitted", "Sent", "Delivered", or "Failed". Use this to tell whether a message you sent earlier actually reached the guest'
              ),
            route: z
              .string()
              .optional()
              .describe(
                'Channel the message travelled over, such as "Email", "Airbnb", "BookingCom", "Vrbo", or "Sms"'
              ),
            attachments: z
              .array(
                z.object({
                  fileName: z.string().optional().describe('Name of the attached file'),
                  contentType: z
                    .string()
                    .optional()
                    .describe('MIME type of the attached file'),
                  contentLength: z
                    .string()
                    .optional()
                    .describe(
                      'Size of the attached file in bytes. Lodgify reports this as a string'
                    ),
                  fileUrl: z
                    .string()
                    .optional()
                    .describe('Lodgify-hosted link to download the attached file')
                })
              )
              .describe('Files attached to this message')
          })
        )
        .describe('Messages in the thread, oldest first as returned by Lodgify'),
      thread: z
        .record(z.string(), z.any())
        .describe('Full thread payload as returned by Lodgify')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.getMessageThread(ctx.input.threadUid);
    let thread = normalizeThread(response, ctx.input.threadUid);

    let messages = (thread.messages ?? []).map(entry => ({
      id: entry.id ?? undefined,
      messageId: entry.message_id ?? undefined,
      subject: entry.subject ?? undefined,
      message: entry.message ?? undefined,
      type: entry.type ?? undefined,
      dateCreated: entry.date_created ?? undefined,
      isRead: entry.is_read ?? undefined,
      messageStatus: entry.message_status ?? undefined,
      route: entry.route ?? undefined,
      attachments: (entry.attachments ?? []).map(attachment => ({
        fileName: attachment.file_name ?? undefined,
        contentType: attachment.content_type ?? undefined,
        contentLength:
          attachment.content_length === undefined || attachment.content_length === null
            ? undefined
            : String(attachment.content_length),
        fileUrl: attachment.file_url ?? undefined
      }))
    }));

    let threadUid = thread.thread_uid ?? ctx.input.threadUid;
    let guestName = thread.guest_name ?? undefined;
    let errorTitle = thread.error_title ?? undefined;
    let closedNote = thread.is_closed
      ? ` This thread is closed to new replies${errorTitle ? `: ${errorTitle}` : ''}.`
      : '';

    return {
      output: {
        threadUid,
        guestName,
        guestEmail: thread.guest_email ?? undefined,
        lastMessageDate: thread.last_message_date ?? undefined,
        isRead: thread.is_read ?? undefined,
        isClosed: thread.is_closed ?? undefined,
        errorTitle,
        errorMessage: thread.error_message ?? undefined,
        messageCount: messages.length,
        messages,
        thread
      },
      message: `Retrieved **${messages.length}** message${messages.length === 1 ? '' : 's'} in thread **${threadUid}**${guestName ? ` with **${guestName}**` : ''}.${closedNote}`
    };
  })
  .build();
