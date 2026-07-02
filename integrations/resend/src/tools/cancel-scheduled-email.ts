import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelScheduledEmail = SlateTool.create(spec, {
  name: 'Cancel Scheduled Email',
  key: 'cancel_scheduled_email',
  description: `Cancel a scheduled email that hasn't been sent yet, or update the scheduled time of a pending email.`,
  instructions: [
    'Only emails that have been scheduled and not yet sent can be cancelled or rescheduled.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      emailId: z.string().describe('ID of the scheduled email.'),
      action: z
        .enum(['cancel', 'reschedule'])
        .describe('Whether to cancel or reschedule the email.'),
      scheduledAt: z
        .string()
        .optional()
        .describe(
          'New scheduled time in ISO 8601 format. Required when action is "reschedule".'
        )
    })
  )
  .output(
    z.object({
      emailId: z.string().describe('ID of the email.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'cancel') {
      let result = await client.cancelEmail(ctx.input.emailId);
      return {
        output: { emailId: result.id },
        message: `Scheduled email \`${result.id}\` has been **cancelled**.`
      };
    } else {
      if (!ctx.input.scheduledAt) {
        throw new Error('scheduledAt is required when rescheduling an email.');
      }
      let result = await client.updateEmail(ctx.input.emailId, {
        scheduledAt: ctx.input.scheduledAt
      });
      return {
        output: { emailId: result.id },
        message: `Scheduled email \`${result.id}\` has been **rescheduled** to ${ctx.input.scheduledAt}.`
      };
    }
  })
  .build();
