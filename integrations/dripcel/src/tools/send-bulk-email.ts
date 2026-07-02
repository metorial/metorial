import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendBulkEmail = SlateTool.create(spec, {
  name: 'Send Bulk Email',
  key: 'send_bulk_email',
  description: `Send bulk emails to multiple recipients using a pre-defined email template. Emails can be scheduled for future delivery. Use the **List Email Templates** tool to find available template IDs.`,
  instructions: [
    'Set filterNonContacts to true when the template uses custom fields — only contacts in your organization will receive the email.',
    'Use scheduledAt to schedule delivery for a future time in ISO 8601 format.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      from: z
        .string()
        .describe('Sender email address (must be a verified email identity in Dripcel)'),
      templateId: z.string().describe('Email template ID to use for the email content'),
      destinations: z.array(z.string()).describe('Array of recipient email addresses'),
      filterNonContacts: z
        .boolean()
        .optional()
        .describe(
          'Filter out addresses that are not existing contacts. Required when using templates with custom fields.'
        ),
      scheduledAt: z
        .string()
        .optional()
        .describe(
          'Schedule delivery for a future time (ISO 8601 format). If omitted, emails are sent immediately.'
        )
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the bulk email was successfully queued')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.sendBulkEmail({
      from: ctx.input.from,
      templateId: ctx.input.templateId,
      destinations: ctx.input.destinations,
      filterNonContacts: ctx.input.filterNonContacts,
      toStartAt: ctx.input.scheduledAt
    });
    return {
      output: { sent: true },
      message: `Bulk email queued for **${ctx.input.destinations.length}** recipient(s) using template \`${ctx.input.templateId}\`.`
    };
  })
  .build();
