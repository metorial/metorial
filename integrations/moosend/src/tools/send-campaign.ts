import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { spec } from '../spec';

export let sendCampaign = SlateTool.create(spec, {
  name: 'Send Campaign',
  key: 'send_campaign',
  description: `Send a draft campaign immediately, schedule it for later delivery, or remove a previously set schedule. Can also send a test email to verify the campaign before sending to the full list.`,
  instructions: [
    'The campaign must be in draft status to send or schedule.',
    'Use action "send_test" before sending to the full list to verify the campaign content.',
    'Maximum 5 test email recipients.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      action: z
        .enum(['send', 'schedule', 'unschedule', 'send_test'])
        .describe('Action to perform on the campaign'),
      scheduleDateTime: z
        .string()
        .optional()
        .describe(
          'Date and time to schedule the campaign (e.g. "2024-06-15T10:00:00"). Required when action is "schedule".'
        ),
      scheduleTimezone: z
        .string()
        .optional()
        .describe(
          'Timezone for the scheduled send (e.g. "Eastern Standard Time"). Defaults to account timezone.'
        ),
      testEmails: z
        .array(z.string())
        .optional()
        .describe(
          'Email addresses for test send (max 5). Required when action is "send_test".'
        )
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });
    let { campaignId, action } = ctx.input;

    switch (action) {
      case 'send':
        await client.sendCampaign(campaignId);
        break;
      case 'schedule':
        if (!ctx.input.scheduleDateTime) {
          throw new Error('scheduleDateTime is required when action is "schedule"');
        }
        await client.scheduleCampaign(
          campaignId,
          ctx.input.scheduleDateTime,
          ctx.input.scheduleTimezone
        );
        break;
      case 'unschedule':
        await client.unscheduleCampaign(campaignId);
        break;
      case 'send_test':
        if (!ctx.input.testEmails || ctx.input.testEmails.length === 0) {
          throw new Error('testEmails is required when action is "send_test"');
        }
        await client.sendTestEmail(campaignId, ctx.input.testEmails);
        break;
    }

    let actionMessages: Record<string, string> = {
      send: 'sent immediately',
      schedule: `scheduled for ${ctx.input.scheduleDateTime}`,
      unschedule: 'schedule removed',
      send_test: `test email sent to ${ctx.input.testEmails?.join(', ')}`
    };

    return {
      output: {
        campaignId,
        action,
        success: true
      },
      message: `Campaign ${campaignId} was **${actionMessages[action]}**.`
    };
  })
  .build();
