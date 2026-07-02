import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { mailchimpServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageCampaignTool = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description: `Create, update, or delete an email campaign. Supports setting recipients, subject line, content, tracking options, and more. To create, omit campaignId. To update, provide campaignId with fields to change. To delete, provide campaignId and set delete to true.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for update/delete, omit for create)'),
      delete: z.boolean().optional().describe('Set to true to delete the campaign'),
      type: z
        .enum(['regular', 'plaintext', 'rss', 'variate'])
        .optional()
        .describe('Campaign type (required for create)'),
      listId: z.string().optional().describe('Audience ID to send the campaign to'),
      savedSegmentId: z.number().optional().describe('Saved segment ID to target'),
      subjectLine: z.string().optional().describe('Email subject line'),
      previewText: z.string().optional().describe('Preview text shown in inbox'),
      title: z.string().optional().describe('Internal campaign title'),
      fromName: z.string().optional().describe('Sender name'),
      replyTo: z.string().optional().describe('Reply-to email address'),
      templateId: z.number().optional().describe('Template ID to use'),
      trackOpens: z.boolean().optional().describe('Track email opens'),
      trackClicks: z.boolean().optional().describe('Track HTML link clicks')
    })
  )
  .output(
    z.object({
      campaignId: z.string(),
      status: z.string().optional(),
      title: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    if (ctx.input.delete && ctx.input.campaignId) {
      await client.deleteCampaign(ctx.input.campaignId);
      return {
        output: { campaignId: ctx.input.campaignId, deleted: true },
        message: `Campaign **${ctx.input.campaignId}** has been deleted.`
      };
    }

    if (ctx.input.delete && !ctx.input.campaignId) {
      throw mailchimpServiceError('campaignId is required to delete a campaign.');
    }

    let data: Record<string, any> = {};

    if (ctx.input.type) data.type = ctx.input.type;

    if (ctx.input.listId) {
      data.recipients = { list_id: ctx.input.listId };
      if (ctx.input.savedSegmentId) {
        data.recipients.segment_opts = { saved_segment_id: ctx.input.savedSegmentId };
      }
    }

    let settings: Record<string, any> = {};
    if (ctx.input.subjectLine) settings.subject_line = ctx.input.subjectLine;
    if (ctx.input.previewText) settings.preview_text = ctx.input.previewText;
    if (ctx.input.title) settings.title = ctx.input.title;
    if (ctx.input.fromName) settings.from_name = ctx.input.fromName;
    if (ctx.input.replyTo) settings.reply_to = ctx.input.replyTo;
    if (ctx.input.templateId) settings.template_id = ctx.input.templateId;
    if (Object.keys(settings).length > 0) data.settings = settings;

    let tracking: Record<string, any> = {};
    if (ctx.input.trackOpens !== undefined) tracking.opens = ctx.input.trackOpens;
    if (ctx.input.trackClicks !== undefined) tracking.html_clicks = ctx.input.trackClicks;
    if (Object.keys(tracking).length > 0) data.tracking = tracking;

    if (ctx.input.campaignId) {
      if (Object.keys(data).length === 0) {
        throw mailchimpServiceError(
          'At least one field must be provided to update a campaign.'
        );
      }

      let result = await client.updateCampaign(ctx.input.campaignId, data);
      return {
        output: {
          campaignId: result.id,
          status: result.status,
          title: result.settings?.title
        },
        message: `Campaign **${result.settings?.title ?? result.id}** has been updated.`
      };
    }

    if (!ctx.input.type) {
      throw mailchimpServiceError('type is required to create a campaign.');
    }

    let result = await client.createCampaign(data);
    return {
      output: {
        campaignId: result.id,
        status: result.status,
        title: result.settings?.title
      },
      message: `Campaign **${result.settings?.title ?? result.id}** (${result.id}) has been created with status **${result.status}**.`
    };
  })
  .build();
