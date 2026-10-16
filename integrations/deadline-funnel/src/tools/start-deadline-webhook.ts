import { SlateTool } from 'slates';
import { z } from 'zod';
import { startDeadlineWebhook as submitDeadlineWebhook } from '../lib/client';
import { spec } from '../spec';

export let startDeadlineWebhook = SlateTool.create(spec, {
  name: 'Start Deadline via Custom Webhook',
  key: 'start_deadline_webhook',
  description:
    'Submit a subscriber email to the campaign-specific custom webhook documented by Deadline Funnel to start deadline tracking.',
  instructions: [
    'Open the campaign editor, select Emails → Custom API, and copy its custom webhook URL.',
    'Use Deadline Funnel email links in campaign emails so the subscriber sees the correct deadline.',
    'An accepted webhook request does not independently verify that a tracking record has appeared. Check the campaign Analytics page to confirm it.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      webhookUrl: z
        .string()
        .describe(
          'HTTPS custom webhook URL copied from the campaign Emails → Custom API tab. Keep this URL private.'
        ),
      email: z.string().describe('Email address of the subscriber to start tracking')
    })
  )
  .output(
    z.object({
      accepted: z
        .boolean()
        .describe('Whether the webhook request received a successful HTTP response'),
      email: z.string().describe('Subscriber email submitted to the campaign webhook')
    })
  )
  .handleInvocation(async ctx => {
    let result = await submitDeadlineWebhook(ctx.input);
    return {
      output: result,
      message: `Deadline tracking webhook accepted for **${result.email}**. Confirm the tracking record in campaign Analytics.`
    };
  })
  .build();
