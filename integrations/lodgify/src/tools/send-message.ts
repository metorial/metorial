import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type LodgifyMessage } from '../lib/client';
import { spec } from '../spec';

let uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to a guest on a booking or on an enquiry, or record an internal note on the conversation. Can be used for booking confirmations, check-in instructions, enquiry replies, or any guest communication. Optionally notifies the guest by email, or pushes the message to the channel the reservation came from.`,
  instructions: [
    'Provide exactly one of bookingId or enquiryId to identify the conversation.',
    'Use type "Comment" to record an internal note that is never delivered to the guest.',
    'Use type "Renter" to log a message as having come from the guest, such as a phone call you are transcribing.',
    'Lodgify can refuse a message type that is not allowed for a given conversation; when it does, the call fails with a provider error rather than silently changing the type.',
    'sendNotification only takes effect on "Owner" messages.',
    'Pass messageId to make retries safe: repeating a call with the same value will not create a duplicate message.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bookingId: z
        .number()
        .optional()
        .describe(
          'The booking ID to send the message for. Provide either this or enquiryId, not both'
        ),
      enquiryId: z
        .number()
        .optional()
        .describe(
          'The enquiry ID to send the message for, to reply to a pre-booking request. Provide either this or bookingId, not both'
        ),
      message: z.string().describe('The message content to send'),
      subject: z.string().optional().describe('Message subject line'),
      type: z
        .enum(['Owner', 'Comment', 'Renter'])
        .optional()
        .default('Owner')
        .describe(
          '"Owner" sends the message to the guest. "Comment" records an internal note on the conversation that the guest never receives. "Renter" records the message as though it was received from the guest, for transcribing a phone call or adding an email the guest sent elsewhere into the conversation. Lodgify may reject a type that is not allowed for the conversation. Defaults to "Owner"'
        ),
      sendNotification: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'Whether to send an email notification to the guest, or push the message to the channel the reservation came from. Only applies to "Owner" messages'
        ),
      messageId: z
        .string()
        .optional()
        .describe(
          'Optional idempotency key in UUID format. Retrying the call with the same value will not create a duplicate message. One is generated automatically if omitted'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was sent successfully'),
      bookingId: z
        .number()
        .optional()
        .describe('The booking the message was added to, when the message targeted a booking'),
      enquiryId: z
        .number()
        .optional()
        .describe(
          'The enquiry the message was added to, when the message targeted an enquiry'
        ),
      messageId: z
        .string()
        .optional()
        .describe(
          'The idempotency key the message was sent with, when one was supplied. Reuse it to retry the same call without creating a duplicate'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let bookingId = ctx.input.bookingId;
    let enquiryId = ctx.input.enquiryId;

    if (bookingId !== undefined && enquiryId !== undefined) {
      throw createApiServiceError(
        'Provide either bookingId or enquiryId, not both. A message belongs to a single booking or enquiry.'
      );
    }

    if (bookingId === undefined && enquiryId === undefined) {
      throw createApiServiceError(
        'Either bookingId or enquiryId must be provided to identify the conversation to send the message to.'
      );
    }

    if (ctx.input.messageId !== undefined && !uuidPattern.test(ctx.input.messageId)) {
      throw createApiServiceError(
        `messageId must be a UUID such as "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", received "${ctx.input.messageId}".`
      );
    }

    let payload: LodgifyMessage = {
      subject: ctx.input.subject,
      message: ctx.input.message,
      type: ctx.input.type,
      // Lodgify only honours the notification flag on Owner messages.
      send_notification: ctx.input.type === 'Owner' ? ctx.input.sendNotification : undefined,
      message_id: ctx.input.messageId
    };

    if (bookingId !== undefined) {
      await client.addMessagesToBooking(bookingId, [payload]);
    } else if (enquiryId !== undefined) {
      await client.addMessagesToEnquiry(enquiryId, [payload]);
    }

    let target =
      bookingId !== undefined ? `booking **#${bookingId}**` : `enquiry **#${enquiryId}**`;

    let output = {
      success: true,
      bookingId,
      enquiryId,
      messageId: ctx.input.messageId
    };

    if (ctx.input.type === 'Comment') {
      return {
        output,
        message: `Added internal note to ${target}.`
      };
    }

    if (ctx.input.type === 'Renter') {
      return {
        output,
        message: `Recorded message from guest on ${target}.`
      };
    }

    return {
      output,
      message: `Sent message to guest for ${target}${ctx.input.sendNotification ? ' (notification sent)' : ''}.`
    };
  })
  .build();
