import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let manageCampaigns = SlateTool.create(spec, {
  name: 'Manage Campaigns',
  key: 'manage_campaigns',
  description: `Create, update, or delete email campaigns. Supports setting campaign name, sender info, subject, HTML/plain text content, target lists, and scheduling. Use this to prepare campaigns before sending.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Operation to perform on the campaign'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for update and delete)'),
      campaignName: z
        .string()
        .optional()
        .describe('Name of the campaign (required for create)'),
      fromName: z
        .string()
        .optional()
        .describe('Sender name displayed in the email (required for create)'),
      fromEmail: z.string().optional().describe('Sender email address (required for create)'),
      replyToName: z.string().optional().describe('Reply-to name'),
      replyToEmail: z.string().optional().describe('Reply-to email address'),
      subject: z.string().optional().describe('Email subject line (required for create)'),
      htmlContent: z.string().optional().describe('HTML content of the email'),
      plainTextContent: z.string().optional().describe('Plain text content of the email'),
      targetListIds: z
        .string()
        .optional()
        .describe('Comma-separated list of target subscriber list IDs'),
      scheduleType: z.string().optional().describe('Schedule type for the campaign'),
      scheduleDateTime: z
        .string()
        .optional()
        .describe('Scheduled date/time to send the campaign (ISO 8601 format)')
    })
  )
  .output(
    z.object({
      campaignId: z.string().optional().describe('ID of the campaign'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { action, campaignId } = ctx.input;

    if (action === 'create') {
      if (
        !ctx.input.campaignName ||
        !ctx.input.fromName ||
        !ctx.input.fromEmail ||
        !ctx.input.subject
      ) {
        throw new Error(
          'campaignName, fromName, fromEmail, and subject are required for creating a campaign'
        );
      }

      let result = await client.createCampaign({
        campaignName: ctx.input.campaignName,
        fromName: ctx.input.fromName,
        fromEmail: ctx.input.fromEmail,
        replyToName: ctx.input.replyToName,
        replyToEmail: ctx.input.replyToEmail,
        subject: ctx.input.subject,
        htmlContent: ctx.input.htmlContent,
        plainTextContent: ctx.input.plainTextContent,
        targetListIds: ctx.input.targetListIds,
        scheduleType: ctx.input.scheduleType,
        scheduleDateTime: ctx.input.scheduleDateTime
      });

      return {
        output: {
          campaignId: String(result.CampaignID || result.CampaignId || ''),
          success: true
        },
        message: `Successfully created campaign **${ctx.input.campaignName}**.`
      };
    }

    if (action === 'update') {
      if (!campaignId) throw new Error('Campaign ID is required for update action');

      await client.updateCampaign(campaignId, {
        campaignName: ctx.input.campaignName,
        fromName: ctx.input.fromName,
        fromEmail: ctx.input.fromEmail,
        replyToName: ctx.input.replyToName,
        replyToEmail: ctx.input.replyToEmail,
        subject: ctx.input.subject,
        htmlContent: ctx.input.htmlContent,
        plainTextContent: ctx.input.plainTextContent,
        targetListIds: ctx.input.targetListIds
      });

      return {
        output: { campaignId, success: true },
        message: `Successfully updated campaign **${campaignId}**.`
      };
    }

    if (action === 'delete') {
      if (!campaignId) throw new Error('Campaign ID is required for delete action');
      await client.deleteCampaign(campaignId);

      return {
        output: { campaignId, success: true },
        message: `Successfully deleted campaign **${campaignId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
