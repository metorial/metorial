import { SlateTool } from 'slates';
import { z } from 'zod';
import { ActiveTrailClient } from '../lib/client';
import { spec } from '../spec';

let campaignOutputSchema = z.object({
  campaignId: z.number().describe('Campaign ID'),
  name: z.string().nullable().optional().describe('Campaign name'),
  subject: z.string().nullable().optional().describe('Email subject'),
  sendType: z.any().optional().describe('Campaign send type'),
  status: z.any().optional().describe('Campaign status')
});

export let listEmailCampaigns = SlateTool.create(spec, {
  name: 'List Email Campaigns',
  key: 'list_email_campaigns',
  description: `List email campaigns with optional filtering by mailing list, category, search term, send type, and date range.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      mailingListId: z.number().optional().describe('Filter by mailing list ID'),
      contentCategoryId: z.number().optional().describe('Filter by content category ID'),
      searchTerm: z.string().optional().describe('Search by campaign name'),
      sendType: z.string().optional().describe('Filter by send type'),
      fromDate: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      toDate: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignOutputSchema).describe('List of email campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.listCampaigns({
      mailingListId: ctx.input.mailingListId,
      contentCategoryId: ctx.input.contentCategoryId,
      searchTerm: ctx.input.searchTerm,
      sendType: ctx.input.sendType,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      page: ctx.input.page,
      limit: ctx.input.limit
    });
    let campaigns = Array.isArray(result) ? result : [];
    return {
      output: {
        campaigns: campaigns.map((c: any) => ({
          campaignId: c.id,
          name: c.details?.name,
          subject: c.details?.subject,
          sendType: c.send_type,
          status: c.status
        }))
      },
      message: `Found **${campaigns.length}** email campaign(s).`
    };
  })
  .build();

export let getEmailCampaign = SlateTool.create(spec, {
  name: 'Get Email Campaign',
  key: 'get_email_campaign',
  description: `Retrieve full details of an email campaign including design, scheduling, and segment settings.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to retrieve')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Campaign ID'),
      name: z.string().nullable().optional().describe('Campaign name'),
      subject: z.string().nullable().optional().describe('Email subject'),
      sendType: z.any().optional().describe('Send type'),
      details: z.any().optional().describe('Campaign details'),
      design: z.any().optional().describe('Campaign design/content'),
      scheduling: z.any().optional().describe('Scheduling settings'),
      segment: z.any().optional().describe('Segment/sending settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let campaign = await client.getCampaign(ctx.input.campaignId);
    return {
      output: {
        campaignId: campaign.id,
        name: campaign.details?.name,
        subject: campaign.details?.subject,
        sendType: campaign.send_type,
        details: campaign.details,
        design: campaign.design,
        scheduling: campaign.scheduling,
        segment: campaign.segment
      },
      message: `Retrieved email campaign **${campaign.details?.name || ctx.input.campaignId}**.`
    };
  })
  .build();

export let createEmailCampaign = SlateTool.create(spec, {
  name: 'Create Email Campaign',
  key: 'create_email_campaign',
  description: `Create a new email campaign. Configure the campaign name, subject, HTML content, target groups, and scheduling. Set **isSent** to true and **scheduledDateUtc** to schedule sending.`,
  instructions: [
    'The campaign requires a user_profile_id from your sending profiles. Use the Account Info tool to retrieve available profiles.',
    'Set isSent to false to create as draft, or true with a scheduledDateUtc to schedule.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Internal campaign name'),
      subject: z.string().describe('Email subject line'),
      userProfileId: z.number().describe('Sending profile ID'),
      htmlContent: z.string().describe('HTML content of the email'),
      preheader: z.string().optional().describe('Email preheader text'),
      groupIds: z.array(z.number()).optional().describe('IDs of groups to send to'),
      mailingListId: z.number().optional().describe('ID of mailing list to send to'),
      isSent: z
        .boolean()
        .optional()
        .describe('Whether to send/schedule the campaign (default false = draft)'),
      scheduledDateUtc: z
        .string()
        .optional()
        .describe('UTC date/time to schedule sending (ISO format)'),
      contentCategoryId: z.number().optional().describe('Content category ID'),
      googleAnalyticsName: z.string().optional().describe('Google Analytics campaign name'),
      templateId: z.number().optional().describe('Template ID to use')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Created campaign ID'),
      name: z.string().nullable().optional().describe('Campaign name'),
      sendType: z.any().optional().describe('Campaign send type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let data: Record<string, any> = {
      details: {
        name: ctx.input.name,
        subject: ctx.input.subject,
        user_profile_id: ctx.input.userProfileId,
        preheader: ctx.input.preheader,
        content_category_id: ctx.input.contentCategoryId,
        google_analytics_name: ctx.input.googleAnalyticsName
      },
      design: {
        content: ctx.input.htmlContent
      },
      scheduling: {
        is_sent: ctx.input.isSent ?? false,
        scheduled_date_utc: ctx.input.scheduledDateUtc
      },
      segment: {
        group_ids: ctx.input.groupIds,
        mailing_list_id: ctx.input.mailingListId
      }
    };
    if (ctx.input.templateId) {
      data.template = { id: ctx.input.templateId };
    }

    let result = await client.createCampaign(data);
    return {
      output: {
        campaignId: result.id,
        name: result.details?.name,
        sendType: result.send_type
      },
      message: `Email campaign **${ctx.input.name}** created with ID **${result.id}**.`
    };
  })
  .build();

export let updateEmailCampaign = SlateTool.create(spec, {
  name: 'Update Email Campaign',
  key: 'update_email_campaign',
  description: `Update a draft email campaign's details, design, sending settings, or schedule. Only campaigns in **draft** status can be updated.`,
  instructions: ['Only draft campaigns can be updated. Sent campaigns cannot be modified.'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to update'),
      name: z.string().optional().describe('Campaign name'),
      subject: z.string().optional().describe('Email subject line'),
      userProfileId: z.number().optional().describe('Sending profile ID'),
      htmlContent: z.string().optional().describe('New HTML content'),
      preheader: z.string().optional().describe('Email preheader text'),
      groupIds: z.array(z.number()).optional().describe('Updated group IDs to send to'),
      mailingListId: z.number().optional().describe('Updated mailing list ID'),
      isSent: z.boolean().optional().describe('Whether to send/schedule the campaign'),
      scheduledDateUtc: z.string().optional().describe('UTC date/time to schedule sending')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful'),
      campaignId: z.number().describe('Campaign ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let { campaignId } = ctx.input;

    if (
      ctx.input.name ||
      ctx.input.subject ||
      ctx.input.userProfileId ||
      ctx.input.preheader
    ) {
      let details: Record<string, any> = {};
      if (ctx.input.name) details.name = ctx.input.name;
      if (ctx.input.subject) details.subject = ctx.input.subject;
      if (ctx.input.userProfileId) details.user_profile_id = ctx.input.userProfileId;
      if (ctx.input.preheader) details.preheader = ctx.input.preheader;
      await client.updateCampaignDetails(campaignId, details);
    }

    if (ctx.input.htmlContent) {
      await client.updateCampaignDesign(campaignId, { content: ctx.input.htmlContent });
    }

    if (ctx.input.groupIds || ctx.input.mailingListId !== undefined) {
      let segment: Record<string, any> = {};
      if (ctx.input.groupIds) segment.group_ids = ctx.input.groupIds;
      if (ctx.input.mailingListId !== undefined)
        segment.mailing_list_id = ctx.input.mailingListId;
      await client.updateCampaignSegment(campaignId, segment);
    }

    if (ctx.input.isSent !== undefined || ctx.input.scheduledDateUtc) {
      let scheduling: Record<string, any> = {};
      if (ctx.input.isSent !== undefined) scheduling.is_sent = ctx.input.isSent;
      if (ctx.input.scheduledDateUtc)
        scheduling.scheduled_date_utc = ctx.input.scheduledDateUtc;
      await client.updateCampaignScheduling(campaignId, scheduling);
    }

    return {
      output: { success: true, campaignId },
      message: `Email campaign **${campaignId}** updated.`
    };
  })
  .build();

export let deleteEmailCampaign = SlateTool.create(spec, {
  name: 'Delete Email Campaign',
  key: 'delete_email_campaign',
  description: `Delete an email campaign by ID.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    await client.deleteCampaign(ctx.input.campaignId);
    return {
      output: { success: true },
      message: `Email campaign **${ctx.input.campaignId}** deleted.`
    };
  })
  .build();
