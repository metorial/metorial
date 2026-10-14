import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let manageCampaigns = SlateTool.create(spec, {
  name: 'Manage Campaigns',
  key: 'manage_campaigns',
  description: `Create, update, or delete email campaigns. Set campaign name, sender info, subject, and target lists; provide HTML/plain text content when creating. Use send_campaign to send or schedule a prepared campaign.`,
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
      htmlContent: z.string().optional().describe('HTML content of the email (create action)'),
      plainTextContent: z
        .string()
        .optional()
        .describe('Plain text content of the email (create action)'),
      targetListIds: z
        .string()
        .optional()
        .describe('Comma-separated list of target subscriber list IDs'),
      scheduleType: z
        .string()
        .optional()
        .describe('Legacy scheduling input; use send_campaign with sendDate instead'),
      scheduleDateTime: z
        .string()
        .optional()
        .describe('Legacy scheduling input; use send_campaign with sendDate instead')
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
      subdomain: ctx.auth.subdomain || ctx.config.subdomain
    });

    let { action, campaignId } = ctx.input;
    if (ctx.input.scheduleType !== undefined || ctx.input.scheduleDateTime !== undefined) {
      throw createApiServiceError(
        'Create or update the campaign first, then use send_campaign with sendDate to schedule delivery.'
      );
    }

    if (action === 'create') {
      if (
        !ctx.input.campaignName ||
        !ctx.input.fromName ||
        !ctx.input.fromEmail ||
        !ctx.input.subject
      ) {
        throw createApiServiceError(
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
      if (ctx.input.htmlContent !== undefined || ctx.input.plainTextContent !== undefined) {
        throw createApiServiceError(
          'The campaign update API supports campaign settings only. Set email content when creating a campaign or edit content in Sendloop.'
        );
      }
      if (!campaignId)
        throw createApiServiceError('Campaign ID is required for update action');

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
      if (!campaignId)
        throw createApiServiceError('Campaign ID is required for delete action');
      await client.deleteCampaign(campaignId);

      return {
        output: { campaignId, success: true },
        message: `Successfully deleted campaign **${campaignId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
