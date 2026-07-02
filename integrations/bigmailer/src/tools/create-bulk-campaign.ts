import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBulkCampaign = SlateTool.create(spec, {
  name: 'Create Bulk Campaign',
  key: 'create_bulk_campaign',
  description: `Create a new bulk (marketing) campaign within a brand. Configure the campaign subject, content, target lists, sender info, tracking, and scheduling. Set \`ready\` to true to activate sending.`,
  instructions: [
    'Provide either html/text content or a templateId to populate the email body.',
    'Use listIds to target specific lists and excludedListIds to exclude lists.',
    'Set ready to true when the campaign is ready to send.'
  ]
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand'),
      name: z.string().optional().describe('Campaign name'),
      subject: z.string().optional().describe('Email subject line'),
      preview: z
        .string()
        .optional()
        .describe('Preview text shown after subject in email clients'),
      fromEmail: z.string().optional().describe('Sender email address'),
      fromName: z.string().optional().describe('Sender display name'),
      replyToEmail: z.string().optional().describe('Reply-to email address'),
      replyToName: z.string().optional().describe('Reply-to display name'),
      recipientName: z
        .string()
        .optional()
        .describe('Recipient personalization using merge tags'),
      html: z.string().optional().describe('HTML email body'),
      text: z.string().optional().describe('Plain text email body'),
      templateId: z.string().optional().describe('Template ID to populate the HTML body'),
      linkParams: z
        .string()
        .optional()
        .describe('Query parameters appended to all links (e.g., UTM params)'),
      listIds: z.array(z.string()).optional().describe('Target list IDs'),
      excludedListIds: z.array(z.string()).optional().describe('List IDs to exclude'),
      segmentId: z.string().optional().describe('Segment filter ID'),
      messageTypeId: z.string().optional().describe('Message type classification ID'),
      trackOpens: z.boolean().optional().describe('Enable open tracking'),
      trackClicks: z.boolean().optional().describe('Enable click tracking'),
      trackTextClicks: z.boolean().optional().describe('Enable text link click tracking'),
      scheduledFor: z.number().optional().describe('Unix timestamp for scheduled send'),
      suppressionListId: z.string().optional().describe('Suppression list ID for exclusions'),
      ready: z.boolean().optional().describe('Set to true to activate sending')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign unique identifier'),
      name: z.string().describe('Campaign name'),
      subject: z.string().describe('Email subject line'),
      status: z
        .string()
        .describe('Campaign status (draft, pending, in progress, complete, etc.)'),
      createdAt: z.string().describe('Creation timestamp (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let payload: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.subject !== undefined) payload.subject = ctx.input.subject;
    if (ctx.input.preview !== undefined) payload.preview = ctx.input.preview;
    if (ctx.input.fromEmail !== undefined || ctx.input.fromName !== undefined) {
      payload.from = {
        ...(ctx.input.fromEmail !== undefined ? { email: ctx.input.fromEmail } : {}),
        ...(ctx.input.fromName !== undefined ? { name: ctx.input.fromName } : {})
      };
    }
    if (ctx.input.replyToEmail !== undefined || ctx.input.replyToName !== undefined) {
      payload.reply_to = {
        ...(ctx.input.replyToEmail !== undefined ? { email: ctx.input.replyToEmail } : {}),
        ...(ctx.input.replyToName !== undefined ? { name: ctx.input.replyToName } : {})
      };
    }
    if (ctx.input.recipientName !== undefined)
      payload.recipient_name = ctx.input.recipientName;
    if (ctx.input.html !== undefined) payload.html = ctx.input.html;
    if (ctx.input.text !== undefined) payload.text = ctx.input.text;
    if (ctx.input.templateId !== undefined) payload.template_id = ctx.input.templateId;
    if (ctx.input.linkParams !== undefined) payload.link_params = ctx.input.linkParams;
    if (ctx.input.listIds !== undefined) payload.list_ids = ctx.input.listIds;
    if (ctx.input.excludedListIds !== undefined)
      payload.excluded_list_ids = ctx.input.excludedListIds;
    if (ctx.input.segmentId !== undefined) payload.segment_id = ctx.input.segmentId;
    if (ctx.input.messageTypeId !== undefined)
      payload.message_type_id = ctx.input.messageTypeId;
    if (ctx.input.trackOpens !== undefined) payload.track_opens = ctx.input.trackOpens;
    if (ctx.input.trackClicks !== undefined) payload.track_clicks = ctx.input.trackClicks;
    if (ctx.input.trackTextClicks !== undefined)
      payload.track_text_clicks = ctx.input.trackTextClicks;
    if (ctx.input.scheduledFor !== undefined) payload.scheduled_for = ctx.input.scheduledFor;
    if (ctx.input.suppressionListId !== undefined)
      payload.suppression_list_id = ctx.input.suppressionListId;
    if (ctx.input.ready !== undefined) payload.ready = ctx.input.ready;

    let campaign = await client.createBulkCampaign(ctx.input.brandId, payload);

    return {
      output: {
        campaignId: campaign.id,
        name: campaign.name || '',
        subject: campaign.subject || '',
        status: campaign.status,
        createdAt: new Date(campaign.created * 1000).toISOString()
      },
      message: `Created bulk campaign **${campaign.name || campaign.id}** (status: ${campaign.status}).`
    };
  })
  .build();
