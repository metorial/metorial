import { SlateTool } from 'slates';
import { z } from 'zod';
import { ActiveTrailClient } from '../lib/client';
import { spec } from '../spec';

export let listSmsCampaigns = SlateTool.create(spec, {
  name: 'List SMS Campaigns',
  key: 'list_sms_campaigns',
  description: `List all SMS campaigns in your account with pagination.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.number().describe('SMS campaign ID'),
            name: z.string().nullable().optional().describe('Campaign name'),
            statusName: z.string().nullable().optional().describe('Campaign status'),
            totalSent: z.number().nullable().optional().describe('Total messages sent')
          })
        )
        .describe('List of SMS campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.listSmsCampaigns({
      page: ctx.input.page,
      limit: ctx.input.limit
    });
    let campaigns = Array.isArray(result) ? result : [];
    return {
      output: {
        campaigns: campaigns.map((c: any) => ({
          campaignId: c.id,
          name: c.name,
          statusName: c.status_name,
          totalSent: c.total_sent
        }))
      },
      message: `Found **${campaigns.length}** SMS campaign(s).`
    };
  })
  .build();

export let getSmsCampaign = SlateTool.create(spec, {
  name: 'Get SMS Campaign',
  key: 'get_sms_campaign',
  description: `Retrieve details of an SMS campaign by ID, including content, targeting, and scheduling information.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the SMS campaign')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('SMS campaign ID'),
      name: z.string().nullable().optional().describe('Campaign name'),
      content: z.string().nullable().optional().describe('SMS content'),
      fromName: z.string().nullable().optional().describe('Sender name'),
      statusName: z.string().nullable().optional().describe('Campaign status'),
      totalSent: z.number().nullable().optional().describe('Total messages sent'),
      scheduling: z.any().optional().describe('Scheduling settings'),
      segment: z.any().optional().describe('Targeting settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let campaign = await client.getSmsCampaign(ctx.input.campaignId);
    return {
      output: {
        campaignId: campaign.id,
        name: campaign.name,
        content: campaign.content,
        fromName: campaign.from_name,
        statusName: campaign.status_name,
        totalSent: campaign.total_sent,
        scheduling: campaign.scheduling,
        segment: campaign.segment
      },
      message: `Retrieved SMS campaign **${campaign.name || ctx.input.campaignId}**.`
    };
  })
  .build();

export let createSmsCampaign = SlateTool.create(spec, {
  name: 'Create SMS Campaign',
  key: 'create_sms_campaign',
  description: `Create a new SMS campaign. Configure the message content, target groups, sender name, and scheduling. Supports link tracking and unsubscribe functionality.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Internal campaign name'),
      content: z.string().describe('SMS message body'),
      fromName: z
        .string()
        .optional()
        .describe('Sender name (max 11 English letters, no special characters)'),
      smsSendingProfileId: z
        .number()
        .optional()
        .describe('SMS sending profile ID (alternative to fromName)'),
      groupIds: z.array(z.number()).optional().describe('IDs of groups to send to'),
      mailingListId: z.number().optional().describe('Mailing list ID to send to'),
      unsubscribeText: z
        .string()
        .optional()
        .describe('Unsubscribe text (required even if unsubscribe link is not used)'),
      canUnsubscribe: z.boolean().optional().describe('Whether to include unsubscribe link'),
      isLinkTracking: z.boolean().optional().describe('Enable link tracking'),
      isSent: z
        .boolean()
        .optional()
        .describe('Whether to send/schedule (default false = draft)'),
      scheduledDate: z.string().optional().describe('Scheduled send date'),
      scheduledTimeZone: z.string().optional().describe('Timezone for scheduled date')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Created SMS campaign ID'),
      name: z.string().nullable().optional().describe('Campaign name'),
      statusName: z.string().nullable().optional().describe('Campaign status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let data: Record<string, any> = {
      name: ctx.input.name,
      content: ctx.input.content,
      from_name: ctx.input.fromName,
      unsubscribe_text: ctx.input.unsubscribeText || 'Unsubscribe',
      can_unsubscribe: ctx.input.canUnsubscribe,
      is_link_tracking: ctx.input.isLinkTracking,
      segment: {
        group_ids: ctx.input.groupIds,
        mailing_list_id: ctx.input.mailingListId,
        sms_sending_profile_id: ctx.input.smsSendingProfileId
      },
      scheduling: {
        is_sent: ctx.input.isSent ?? false,
        scheduled_date: ctx.input.scheduledDate,
        scheduled_time_zone: ctx.input.scheduledTimeZone
      }
    };

    let result = await client.createSmsCampaign(data);
    return {
      output: {
        campaignId: result.id,
        name: result.name,
        statusName: result.status_name
      },
      message: `SMS campaign **${ctx.input.name}** created with ID **${result.id}**.`
    };
  })
  .build();
