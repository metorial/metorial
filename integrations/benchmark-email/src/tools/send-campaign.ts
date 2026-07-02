import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendCampaign = SlateTool.create(spec, {
  name: 'Send or Schedule Campaign',
  key: 'send_campaign',
  description: `Schedule an email campaign for delivery at a specific date and time, set it back to draft, duplicate it, or resend it to newly added contacts. Use this tool after creating a campaign to control its delivery.`,
  instructions: [
    'To schedule, provide `scheduleDate` in "YYYY-MM-DD HH:mm" format and a `timezone` (e.g. "US/Eastern").',
    'Use `action: "draft"` to cancel a scheduled delivery and revert to draft status.',
    'Use `action: "duplicate"` to create a copy of the campaign.',
    'Use `action: "resend"` to resend to contacts added since the original send.'
  ]
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      action: z
        .enum(['schedule', 'draft', 'duplicate', 'resend'])
        .describe('Action to perform on the campaign'),
      scheduleDate: z
        .string()
        .optional()
        .describe(
          'Date/time to schedule (YYYY-MM-DD HH:mm). Required when action is "schedule"'
        ),
      timezone: z
        .string()
        .optional()
        .describe(
          'Timezone for scheduling (e.g. "US/Eastern", "US/Pacific"). Required when action is "schedule"'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      newCampaignId: z
        .string()
        .optional()
        .describe('ID of the new campaign (when action is "duplicate")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { campaignId, action } = ctx.input;
    let success = false;
    let newCampaignId: string | undefined;
    let message = '';

    switch (action) {
      case 'schedule': {
        if (!ctx.input.scheduleDate || !ctx.input.timezone) {
          throw new Error('scheduleDate and timezone are required when action is "schedule"');
        }
        let result = await client.scheduleCampaign(campaignId, {
          scheduleDate: ctx.input.scheduleDate,
          timezone: ctx.input.timezone
        });
        success = result?.Status === 1;
        message = success
          ? `Scheduled campaign \`${campaignId}\` for **${ctx.input.scheduleDate}** (${ctx.input.timezone}).`
          : `Failed to schedule campaign \`${campaignId}\`.`;
        break;
      }
      case 'draft': {
        let result = await client.setToDraft(campaignId);
        success = result?.Status === 1;
        message = success
          ? `Set campaign \`${campaignId}\` back to draft.`
          : `Failed to set campaign \`${campaignId}\` to draft.`;
        break;
      }
      case 'duplicate': {
        let result = await client.duplicateCampaign(campaignId);
        success = result?.Status === 1;
        newCampaignId = String(result?.Data ?? '');
        message = success
          ? `Duplicated campaign \`${campaignId}\`. New campaign ID: \`${newCampaignId}\`.`
          : `Failed to duplicate campaign \`${campaignId}\`.`;
        break;
      }
      case 'resend': {
        let result = await client.resendCampaign(campaignId);
        success = result?.Status === 1;
        message = success
          ? `Resending campaign \`${campaignId}\` to newly added contacts.`
          : `Failed to resend campaign \`${campaignId}\`.`;
        break;
      }
    }

    return {
      output: { success, newCampaignId },
      message
    };
  })
  .build();
