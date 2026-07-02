import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignOutputSchema = z.object({
  campaignId: z.string().describe('Unique identifier of the campaign'),
  name: z.string().describe('Internal name of the campaign'),
  subject: z.string().describe('Email subject line'),
  state: z.string().describe('Current state of the campaign'),
  type: z.string().describe('Campaign type (e.g. regular)'),
  fromName: z.string().describe('Sender display name'),
  fromEmail: z.string().describe('Sender email address'),
  replyTo: z.string().describe('Reply-to email address'),
  listIds: z.array(z.string()).describe('Target mailing list IDs'),
  googleAnalytics: z.string().describe('Google Analytics tracking status'),
  mtrack: z.string().describe('Mtrack tracking status'),
  deliveryRequested: z.string().nullable().describe('Scheduled delivery date/time'),
  deliveryStarted: z.string().nullable().describe('Actual delivery start time'),
  deliveryEnded: z.string().nullable().describe('Delivery completion time'),
  created: z.string().describe('Creation timestamp'),
  modified: z.string().describe('Last modified timestamp')
});

let mapCampaign = (c: any) => ({
  campaignId: c.campaign_id,
  name: c.name,
  subject: c.subject,
  state: c.state,
  type: c.type,
  fromName: c.from?.name ?? '',
  fromEmail: c.from?.email ?? '',
  replyTo: c.reply_to ?? '',
  listIds: c.list_ids ?? [],
  googleAnalytics: c.stats?.ga ?? '',
  mtrack: c.stats?.mtrack ?? '',
  deliveryRequested: c.delivery_requested ?? null,
  deliveryStarted: c.delivery_started ?? null,
  deliveryEnded: c.delivery_ended ?? null,
  created: c.created,
  modified: c.modified
});

export let getCampaigns = SlateTool.create(spec, {
  name: 'Get Campaigns',
  key: 'get_campaigns',
  description: `Retrieves email campaigns from Laposta. Provide a **campaignId** to get a specific campaign, or omit it to list all campaigns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().optional().describe('ID of a specific campaign to retrieve')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignOutputSchema).describe('Retrieved campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.campaignId) {
      let result = await client.getCampaign(ctx.input.campaignId);
      let campaign = mapCampaign(result.campaign);
      return {
        output: { campaigns: [campaign] },
        message: `Retrieved campaign **${campaign.name}** (${campaign.state}).`
      };
    }

    let results = await client.getCampaigns();
    let campaigns = results.map(r => mapCampaign(r.campaign));
    return {
      output: { campaigns },
      message: `Retrieved ${campaigns.length} campaign(s).`
    };
  })
  .build();

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Creates a new email campaign in Laposta. After creation, use **Set Campaign Content** to add HTML content and **Send Campaign** to dispatch it. The sender email must be a pre-approved address in your account.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Internal name for the campaign'),
      subject: z.string().describe('Email subject line'),
      fromName: z.string().describe('Sender display name'),
      fromEmail: z.string().describe('Sender email address (must be pre-approved)'),
      replyTo: z.string().optional().describe('Reply-to email address'),
      listIds: z.array(z.string()).describe('Target mailing list IDs'),
      googleAnalytics: z.boolean().optional().describe('Enable Google Analytics tracking'),
      mtrack: z.boolean().optional().describe('Enable Mtrack tracking')
    })
  )
  .output(campaignOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createCampaign({
      type: 'regular',
      name: ctx.input.name,
      subject: ctx.input.subject,
      fromName: ctx.input.fromName,
      fromEmail: ctx.input.fromEmail,
      replyTo: ctx.input.replyTo,
      listIds: ctx.input.listIds,
      googleAnalytics: ctx.input.googleAnalytics,
      mtrack: ctx.input.mtrack
    });

    let campaign = mapCampaign(result.campaign);
    return {
      output: campaign,
      message: `Created campaign **${campaign.name}** (${campaign.campaignId}).`
    };
  })
  .build();

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Updates an existing campaign's properties in Laposta. Only the provided fields will be changed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to update'),
      name: z.string().optional().describe('New internal name'),
      subject: z.string().optional().describe('New email subject line'),
      fromName: z.string().optional().describe('New sender display name'),
      fromEmail: z
        .string()
        .optional()
        .describe('New sender email address (must be pre-approved)'),
      replyTo: z.string().optional().describe('New reply-to email'),
      listIds: z.array(z.string()).optional().describe('New target list IDs'),
      googleAnalytics: z
        .boolean()
        .optional()
        .describe('Enable/disable Google Analytics tracking'),
      mtrack: z.boolean().optional().describe('Enable/disable Mtrack tracking')
    })
  )
  .output(campaignOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateCampaign(ctx.input.campaignId, {
      name: ctx.input.name,
      subject: ctx.input.subject,
      fromName: ctx.input.fromName,
      fromEmail: ctx.input.fromEmail,
      replyTo: ctx.input.replyTo,
      listIds: ctx.input.listIds,
      googleAnalytics: ctx.input.googleAnalytics,
      mtrack: ctx.input.mtrack
    });

    let campaign = mapCampaign(result.campaign);
    return {
      output: campaign,
      message: `Updated campaign **${campaign.name}**.`
    };
  })
  .build();

export let deleteCampaign = SlateTool.create(spec, {
  name: 'Delete Campaign',
  key: 'delete_campaign',
  description: `Permanently deletes a campaign from Laposta. The campaign can no longer be retrieved after deletion.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to delete')
    })
  )
  .output(campaignOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteCampaign(ctx.input.campaignId);
    let campaign = mapCampaign(result.campaign);
    return {
      output: campaign,
      message: `Deleted campaign **${campaign.name}** (${campaign.campaignId}).`
    };
  })
  .build();

export let setCampaignContent = SlateTool.create(spec, {
  name: 'Set Campaign Content',
  key: 'set_campaign_content',
  description: `Sets the HTML content for a Laposta campaign. Content can be provided as raw HTML or imported from a URL. If both are provided, the raw HTML takes precedence. Optionally inlines CSS when importing from a URL.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to set content for'),
      html: z.string().optional().describe('Raw HTML content for the campaign email'),
      importUrl: z.string().optional().describe('URL to import HTML content from'),
      inlineCss: z
        .boolean()
        .optional()
        .describe('Whether to inline CSS when importing from a URL')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      html: z.string().describe('Campaign HTML content'),
      plaintext: z.string().describe('Automatically generated plaintext version'),
      importUrl: z.string().describe('Import URL if used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.setCampaignContent(ctx.input.campaignId, {
      html: ctx.input.html,
      importUrl: ctx.input.importUrl,
      inlineCss: ctx.input.inlineCss
    });

    let content = result.campaign;
    return {
      output: {
        campaignId: content.campaign_id,
        html: content.html,
        plaintext: content.plaintext,
        importUrl: content.import_url
      },
      message: `Set content for campaign ${content.campaign_id}.`
    };
  })
  .build();

export let sendCampaign = SlateTool.create(spec, {
  name: 'Send Campaign',
  key: 'send_campaign',
  description: `Sends or schedules a Laposta campaign. Send immediately or schedule for a specific date and time. You can also send a test email to preview the campaign before dispatching. Re-sending a campaign only delivers to subscribers added since the last send.`,
  instructions: [
    'Set the **action** to "send" for immediate delivery, "schedule" to schedule for later, or "test" to send a test email.',
    'For scheduling, provide **scheduledTime** in YYYY-MM-DD HH:MM:SS format.',
    'For test emails, provide the **testEmail** address.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to send'),
      action: z
        .enum(['send', 'schedule', 'test'])
        .describe('Action to perform: send immediately, schedule, or send test'),
      scheduledTime: z
        .string()
        .optional()
        .describe(
          'Scheduled delivery time in YYYY-MM-DD HH:MM:SS format (required for "schedule" action)'
        ),
      testEmail: z
        .string()
        .optional()
        .describe('Email address to send a test email to (required for "test" action)')
    })
  )
  .output(campaignOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.action === 'send') {
      result = await client.sendCampaign(ctx.input.campaignId);
    } else if (ctx.input.action === 'schedule') {
      if (!ctx.input.scheduledTime) {
        throw new Error('scheduledTime is required when action is "schedule"');
      }
      result = await client.scheduleCampaign(ctx.input.campaignId, ctx.input.scheduledTime);
    } else {
      if (!ctx.input.testEmail) {
        throw new Error('testEmail is required when action is "test"');
      }
      result = await client.sendTestEmail(ctx.input.campaignId, ctx.input.testEmail);
    }

    let campaign = mapCampaign(result.campaign);
    let actionMsg =
      ctx.input.action === 'send'
        ? 'Sent'
        : ctx.input.action === 'schedule'
          ? `Scheduled for ${ctx.input.scheduledTime}`
          : `Sent test email to ${ctx.input.testEmail} for`;
    return {
      output: campaign,
      message: `${actionMsg} campaign **${campaign.name}**.`
    };
  })
  .build();
