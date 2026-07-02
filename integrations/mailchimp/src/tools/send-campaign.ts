import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { mailchimpServiceError } from '../lib/errors';
import { spec } from '../spec';

export let sendCampaignTool = SlateTool.create(spec, {
  name: 'Send Campaign',
  key: 'send_campaign',
  description: `Send, schedule, unschedule, or cancel a campaign. Can also send a test email or replicate a campaign. Use the send checklist to verify readiness before sending.`,
  instructions: [
    'Use action "send" to immediately send the campaign.',
    'Use "schedule" with a scheduleTime (ISO 8601) to schedule. Time must be on a quarter-hour (:00, :15, :30, :45).',
    'Use "test" with testEmails to send a test email before sending for real.',
    'Use "replicate" to create a copy of an existing campaign.',
    'Use "checklist" to verify the campaign is ready to send.'
  ],
  constraints: [
    'Campaign must have content and recipients configured before sending.',
    'Schedule time must be on quarter-hour intervals.',
    'With timewarp, schedule must be at least 24 hours in advance.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      action: z
        .enum(['send', 'schedule', 'unschedule', 'cancel', 'test', 'replicate', 'checklist'])
        .describe('Action to perform on the campaign'),
      scheduleTime: z
        .string()
        .optional()
        .describe('Schedule time in ISO 8601 format (required for "schedule" action)'),
      timewarp: z
        .boolean()
        .optional()
        .describe('Enable timewarp sending (schedule action only)'),
      testEmails: z
        .array(z.string())
        .optional()
        .describe('Email addresses for test send (required for "test" action)'),
      sendType: z
        .enum(['html', 'plaintext'])
        .optional()
        .describe('Email format for test send (default "html")')
    })
  )
  .output(
    z.object({
      campaignId: z.string(),
      action: z.string(),
      success: z.boolean(),
      replicatedCampaignId: z.string().optional(),
      checklistItems: z
        .array(
          z.object({
            type: z.string(),
            heading: z.string(),
            isReady: z.boolean()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let { campaignId, action } = ctx.input;

    switch (action) {
      case 'send': {
        await client.sendCampaign(campaignId);
        return {
          output: { campaignId, action: 'send', success: true },
          message: `Campaign **${campaignId}** is being sent.`
        };
      }
      case 'schedule': {
        if (!ctx.input.scheduleTime) {
          throw mailchimpServiceError('scheduleTime is required when action is "schedule".');
        }

        await client.scheduleCampaign(campaignId, ctx.input.scheduleTime!, ctx.input.timewarp);
        return {
          output: { campaignId, action: 'schedule', success: true },
          message: `Campaign **${campaignId}** scheduled for **${ctx.input.scheduleTime}**.`
        };
      }
      case 'unschedule': {
        await client.unscheduleCampaign(campaignId);
        return {
          output: { campaignId, action: 'unschedule', success: true },
          message: `Campaign **${campaignId}** has been unscheduled.`
        };
      }
      case 'cancel': {
        await client.cancelCampaign(campaignId);
        return {
          output: { campaignId, action: 'cancel', success: true },
          message: `Campaign **${campaignId}** send has been cancelled.`
        };
      }
      case 'test': {
        if (!ctx.input.testEmails || ctx.input.testEmails.length === 0) {
          throw mailchimpServiceError('testEmails is required when action is "test".');
        }

        await client.sendTestEmail(
          campaignId,
          ctx.input.testEmails,
          ctx.input.sendType ?? 'html'
        );
        return {
          output: { campaignId, action: 'test', success: true },
          message: `Test email sent for campaign **${campaignId}** to ${ctx.input.testEmails.join(', ')}.`
        };
      }
      case 'replicate': {
        let result = await client.replicateCampaign(campaignId);
        return {
          output: {
            campaignId,
            action: 'replicate',
            success: true,
            replicatedCampaignId: result.id
          },
          message: `Campaign **${campaignId}** replicated as **${result.id}**.`
        };
      }
      case 'checklist': {
        let result = await client.getSendChecklist(campaignId);
        let items = (result.items ?? []).map((item: any) => ({
          type: item.type,
          heading: item.heading,
          isReady: item.id !== 'error'
        }));
        let ready = result.is_ready ?? false;
        return {
          output: { campaignId, action: 'checklist', success: true, checklistItems: items },
          message: ready
            ? `Campaign **${campaignId}** is **ready** to send.`
            : `Campaign **${campaignId}** is **not ready** to send. Check the checklist items for details.`
        };
      }
    }
  })
  .build();
