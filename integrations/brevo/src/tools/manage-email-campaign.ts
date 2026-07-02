import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { brevoServiceError } from '../lib/errors';
import { spec } from '../spec';

let buildSender = (input: {
  senderId?: number;
  senderEmail?: string;
  senderName?: string;
}) => {
  let hasSenderId = input.senderId !== undefined;
  let hasSenderEmail = Boolean(input.senderEmail);

  if (hasSenderId === hasSenderEmail) {
    throw brevoServiceError('Provide exactly one of senderId or senderEmail.');
  }

  let sender: { name?: string; email?: string; id?: number } = {};
  if (input.senderId !== undefined) {
    sender.id = input.senderId;
  } else {
    sender.email = input.senderEmail;
    if (input.senderName) sender.name = input.senderName;
  }

  return sender;
};

let buildRecipients = (input: {
  recipientListIds?: number[];
  exclusionListIds?: number[];
}) => {
  if (!input.recipientListIds && !input.exclusionListIds) {
    return undefined;
  }

  return {
    listIds: input.recipientListIds,
    exclusionListIds: input.exclusionListIds
  };
};

let assertSingleContentSource = (input: {
  htmlContent?: string;
  htmlUrl?: string;
  templateId?: number;
}) => {
  let contentSources = [
    Boolean(input.htmlContent),
    Boolean(input.htmlUrl),
    input.templateId !== undefined
  ].filter(Boolean).length;

  if (contentSources !== 1) {
    throw brevoServiceError('Provide exactly one of htmlContent, htmlUrl, or templateId.');
  }
};

export let createEmailCampaign = SlateTool.create(spec, {
  name: 'Create Email Campaign',
  key: 'create_email_campaign',
  description: `Create a new email campaign in Brevo. Configure the sender, subject, content (HTML or template), recipients, and optionally schedule it for later sending.`,
  instructions: [
    'Either sender email or sender ID must be provided, not both.',
    'Use recipients.listIds to target specific contact lists.',
    'To send the campaign immediately after creation, use the Send Email Campaign tool.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Campaign name'),
      senderEmail: z.string().optional().describe('Verified sender email address'),
      senderName: z.string().optional().describe('Sender display name'),
      senderId: z.number().optional().describe('Sender ID (alternative to senderEmail)'),
      subject: z.string().optional().describe('Email subject line'),
      htmlContent: z.string().optional().describe('HTML email content'),
      htmlUrl: z.string().optional().describe('URL to fetch HTML content from'),
      templateId: z.number().optional().describe('Template ID to use'),
      recipientListIds: z.array(z.number()).optional().describe('Contact list IDs to send to'),
      exclusionListIds: z.array(z.number()).optional().describe('Contact list IDs to exclude'),
      scheduledAt: z.string().optional().describe('ISO 8601 date-time to schedule sending'),
      replyTo: z.string().optional().describe('Reply-to email address'),
      tag: z.string().optional().describe('Campaign tag'),
      templateParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Dynamic template parameters')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('ID of the newly created campaign')
    })
  )
  .handleInvocation(async ctx => {
    assertSingleContentSource(ctx.input);

    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let sender = buildSender(ctx.input);
    let recipients = buildRecipients(ctx.input);

    let result = await client.createEmailCampaign({
      name: ctx.input.name,
      sender,
      subject: ctx.input.subject,
      htmlContent: ctx.input.htmlContent,
      htmlUrl: ctx.input.htmlUrl,
      templateId: ctx.input.templateId,
      scheduledAt: ctx.input.scheduledAt,
      replyTo: ctx.input.replyTo,
      recipients,
      tag: ctx.input.tag,
      params: ctx.input.templateParams
    });

    return {
      output: result,
      message: `Email campaign **${ctx.input.name}** created. Campaign ID: **${result.campaignId}**`
    };
  });

export let updateEmailCampaign = SlateTool.create(spec, {
  name: 'Update Email Campaign',
  key: 'update_email_campaign',
  description: `Update an existing draft or scheduled Brevo email campaign's name, sender, subject, content, recipients, schedule, reply-to, tag, or template parameters.`,
  instructions: [
    'Only draft or scheduled campaigns can be modified.',
    'If changing campaign content, provide exactly one of htmlContent, htmlUrl, or templateId.',
    'If changing sender, provide exactly one of senderEmail or senderId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to update'),
      name: z.string().optional().describe('New campaign name'),
      senderEmail: z.string().optional().describe('Verified sender email address'),
      senderName: z.string().optional().describe('Sender display name'),
      senderId: z.number().optional().describe('Sender ID'),
      subject: z.string().optional().describe('Email subject line'),
      htmlContent: z.string().optional().describe('HTML email content'),
      htmlUrl: z.string().optional().describe('URL to fetch HTML content from'),
      templateId: z.number().optional().describe('Template ID to use'),
      recipientListIds: z.array(z.number()).optional().describe('Contact list IDs to send to'),
      exclusionListIds: z.array(z.number()).optional().describe('Contact list IDs to exclude'),
      scheduledAt: z.string().optional().describe('ISO 8601 date-time to schedule sending'),
      replyTo: z.string().optional().describe('Reply-to email address'),
      tag: z.string().optional().describe('Campaign tag'),
      templateParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Dynamic template parameters')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let hasContentUpdate =
      Boolean(ctx.input.htmlContent) ||
      Boolean(ctx.input.htmlUrl) ||
      ctx.input.templateId !== undefined;
    if (hasContentUpdate) {
      assertSingleContentSource(ctx.input);
    }

    if (ctx.input.senderName && ctx.input.senderId === undefined && !ctx.input.senderEmail) {
      throw brevoServiceError('senderName can only be used with senderEmail.');
    }

    let sender =
      ctx.input.senderId !== undefined || ctx.input.senderEmail
        ? buildSender(ctx.input)
        : undefined;
    let recipients = buildRecipients(ctx.input);

    if (
      !ctx.input.name &&
      !sender &&
      !ctx.input.subject &&
      !hasContentUpdate &&
      !recipients &&
      !ctx.input.scheduledAt &&
      !ctx.input.replyTo &&
      !ctx.input.tag &&
      !ctx.input.templateParams
    ) {
      throw brevoServiceError('Provide at least one campaign field to update.');
    }

    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.updateEmailCampaign(ctx.input.campaignId, {
      name: ctx.input.name,
      sender,
      subject: ctx.input.subject,
      htmlContent: ctx.input.htmlContent,
      htmlUrl: ctx.input.htmlUrl,
      templateId: ctx.input.templateId,
      scheduledAt: ctx.input.scheduledAt,
      replyTo: ctx.input.replyTo,
      recipients,
      tag: ctx.input.tag,
      params: ctx.input.templateParams
    });

    return {
      output: { success: true },
      message: `Email campaign **${ctx.input.campaignId}** updated successfully.`
    };
  });

export let getEmailCampaign = SlateTool.create(spec, {
  name: 'Get Email Campaign',
  key: 'get_email_campaign',
  description: `Retrieve details and report for a specific email campaign, including status, statistics, and configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to retrieve')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Campaign ID'),
      name: z.string().describe('Campaign name'),
      subject: z.string().optional().describe('Email subject'),
      status: z.string().describe('Campaign status'),
      type: z.string().optional().describe('Campaign type'),
      sender: z
        .object({
          email: z.string().optional(),
          name: z.string().optional()
        })
        .optional()
        .describe('Sender details'),
      scheduledAt: z.string().optional().describe('Scheduled send time'),
      createdAt: z.string().describe('Creation timestamp'),
      modifiedAt: z.string().describe('Last modification timestamp'),
      statistics: z.any().optional().describe('Campaign statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let campaign = await client.getEmailCampaign(ctx.input.campaignId);

    return {
      output: {
        campaignId: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        type: campaign.type,
        sender: campaign.sender,
        scheduledAt: campaign.scheduledAt,
        createdAt: campaign.createdAt,
        modifiedAt: campaign.modifiedAt,
        statistics: campaign.statistics
      },
      message: `Retrieved campaign **${campaign.name}** (status: ${campaign.status}).`
    };
  });

export let listEmailCampaigns = SlateTool.create(spec, {
  name: 'List Email Campaigns',
  key: 'list_email_campaigns',
  description: `Retrieve a paginated list of email campaigns with optional filtering by type, status, and date range.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      type: z.enum(['classic', 'trigger']).optional().describe('Filter by campaign type'),
      status: z.string().optional().describe('Filter by campaign status'),
      statistics: z
        .enum([
          'globalStats',
          'linksStats',
          'statsByDomain',
          'statsByDevice',
          'statsByBrowser'
        ])
        .optional()
        .describe('Type of statistics to include'),
      startDate: z
        .string()
        .optional()
        .describe('Filter campaigns sent after this UTC date-time'),
      endDate: z
        .string()
        .optional()
        .describe('Filter campaigns sent before this UTC date-time'),
      limit: z.number().optional().describe('Number of campaigns per page'),
      offset: z.number().optional().describe('Index of the first campaign'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.number().describe('Campaign ID'),
            name: z.string().describe('Campaign name'),
            subject: z.string().optional().describe('Email subject'),
            status: z.string().describe('Campaign status'),
            type: z.string().optional().describe('Campaign type'),
            scheduledAt: z.string().optional().describe('Scheduled send time'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of campaigns'),
      count: z.number().describe('Total number of campaigns matching the filter')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.listEmailCampaigns({
      type: ctx.input.type,
      status: ctx.input.status,
      statistics: ctx.input.statistics,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort
    });

    let campaigns = (result.campaigns ?? []).map((c: any) => ({
      campaignId: c.id,
      name: c.name,
      subject: c.subject,
      status: c.status,
      type: c.type,
      scheduledAt: c.scheduledAt,
      createdAt: c.createdAt
    }));

    return {
      output: { campaigns, count: result.count },
      message: `Retrieved **${campaigns.length}** email campaigns (${result.count} total).`
    };
  });

export let sendEmailCampaignNow = SlateTool.create(spec, {
  name: 'Send Email Campaign',
  key: 'send_email_campaign_now',
  description: `Immediately send an existing email campaign that has been created but not yet sent.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to send')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the send was triggered successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.sendEmailCampaignNow(ctx.input.campaignId);

    return {
      output: { success: true },
      message: `Campaign **${ctx.input.campaignId}** is now being sent.`
    };
  });

export let deleteEmailCampaign = SlateTool.create(spec, {
  name: 'Delete Email Campaign',
  key: 'delete_email_campaign',
  description: `Delete a Brevo email campaign that has not been scheduled or sent.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.deleteEmailCampaign(ctx.input.campaignId);

    return {
      output: { success: true },
      message: `Email campaign **${ctx.input.campaignId}** deleted successfully.`
    };
  });
