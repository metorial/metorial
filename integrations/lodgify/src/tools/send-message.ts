import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to a guest associated with a booking. Can be used for booking confirmations, check-in instructions, or any guest communication. Optionally sends an email notification to the guest.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bookingId: z.number().describe('The booking ID to send the message for'),
      message: z.string().describe('The message content to send'),
      subject: z.string().optional().describe('Message subject line'),
      sendNotification: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to send an email notification to the guest')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.addMessagesToBooking(ctx.input.bookingId, [
      {
        subject: ctx.input.subject,
        message: ctx.input.message,
        type: 'Owner',
        send_notification: ctx.input.sendNotification
      }
    ]);

    return {
      output: { success: true },
      message: `Sent message to guest for booking **#${ctx.input.bookingId}**${ctx.input.sendNotification ? ' (notification sent)' : ''}.`
    };
  })
  .build();
