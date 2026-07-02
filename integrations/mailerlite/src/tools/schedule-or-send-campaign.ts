import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mailerLiteServiceError } from '../lib/errors';
import { spec } from '../spec';

export let scheduleOrSendCampaign = SlateTool.create(spec, {
  name: 'Schedule or Send Campaign',
  key: 'schedule_or_send_campaign',
  description: `Schedules a campaign for delivery or sends it immediately. Supports instant delivery, scheduled delivery at a specific date/time, and timezone-based delivery. Can also cancel a scheduled (ready) campaign, reverting it to draft.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to schedule or send'),
      action: z
        .enum(['send', 'schedule', 'timezone_based', 'smart_sending', 'cancel'])
        .describe(
          '"send" for instant delivery, "schedule" to set a future date, "timezone_based" for local-recipient time delivery, "smart_sending" for MailerLite smart sending, "cancel" to revert a ready campaign to draft'
        ),
      date: z
        .string()
        .optional()
        .describe('Scheduled date in YYYY-MM-DD format (required for schedule action)'),
      hours: z.string().optional().describe('Hour to send (00-23, for schedule action)'),
      minutes: z.string().optional().describe('Minutes to send (00-59, for schedule action)'),
      timezoneId: z
        .number()
        .optional()
        .describe('Timezone ID for scheduling (get IDs from List Timezones)')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      status: z.string().optional().describe('Updated campaign status'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'cancel') {
      let result = await client.cancelCampaign(ctx.input.campaignId);
      return {
        output: {
          campaignId: ctx.input.campaignId,
          status: result.data?.status || 'draft',
          success: true
        },
        message: `Campaign **${ctx.input.campaignId}** has been cancelled and reverted to draft.`
      };
    }

    if (ctx.input.action === 'schedule' || ctx.input.action === 'smart_sending') {
      if (!ctx.input.date) {
        throw mailerLiteServiceError(
          'date is required for schedule and smart_sending actions.'
        );
      }
    }

    if (ctx.input.action === 'schedule' || ctx.input.action === 'timezone_based') {
      if (!ctx.input.hours || !ctx.input.minutes) {
        throw mailerLiteServiceError(
          'hours and minutes are required for schedule and timezone_based actions.'
        );
      }
    }

    let deliveryByAction = {
      send: 'instant',
      schedule: 'scheduled',
      timezone_based: 'timezone_based',
      smart_sending: 'smart_sending'
    } as const;

    let result = await client.scheduleCampaign(ctx.input.campaignId, {
      delivery: deliveryByAction[ctx.input.action],
      date: ctx.input.date,
      hours: ctx.input.hours,
      minutes: ctx.input.minutes,
      timezone_id: ctx.input.timezoneId
    });

    return {
      output: {
        campaignId: ctx.input.campaignId,
        status: result.data?.status,
        success: true
      },
      message:
        ctx.input.action === 'send'
          ? `Campaign **${ctx.input.campaignId}** has been sent.`
          : `Campaign **${ctx.input.campaignId}** has been scheduled for **${ctx.input.date}** at **${ctx.input.hours}:${ctx.input.minutes}**.`
    };
  })
  .build();
