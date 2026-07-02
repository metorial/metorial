import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCampaigns = SlateTool.create(spec, {
  name: 'Manage Campaigns',
  key: 'manage_campaigns',
  description: `Create, update, or delete email campaigns. Campaigns can also be sent immediately or scheduled for a specific date.
Combine creation and sending in separate calls: first create, then send.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'send'])
        .describe('The operation to perform on the campaign'),
      campaignId: z
        .number()
        .optional()
        .describe('ID of the campaign. Required for update, delete, and send actions.'),
      name: z
        .string()
        .optional()
        .describe('Campaign name (max 100 characters). Required for create.'),
      fromName: z
        .string()
        .optional()
        .describe('Sender name (max 100 characters). Required for create.'),
      fromEmail: z.string().optional().describe('Sender email address. Required for create.'),
      subject: z
        .string()
        .optional()
        .describe('Email subject line (max 100 characters). Required for create.'),
      preheader: z
        .string()
        .optional()
        .describe('Preview text shown in inbox (max 100 characters)'),
      replyTo: z.string().optional().describe('Reply-to email address'),
      sendType: z
        .enum(['immediate', 'scheduled'])
        .optional()
        .describe('How to send the campaign. Required for send action.'),
      scheduledDate: z
        .string()
        .optional()
        .describe(
          'Date and time to send the campaign (ISO 8601 format). Required when sendType is "scheduled".'
        )
    })
  )
  .output(
    z.object({
      campaignId: z.number().optional().describe('ID of the campaign'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.config.accountEmail
    });

    if (ctx.input.action === 'create') {
      if (
        !ctx.input.name ||
        !ctx.input.fromName ||
        !ctx.input.fromEmail ||
        !ctx.input.subject
      ) {
        throw new Error(
          'name, fromName, fromEmail, and subject are required when creating a campaign'
        );
      }
      let result = await client.createCampaign({
        name: ctx.input.name,
        fromName: ctx.input.fromName,
        fromEmail: ctx.input.fromEmail,
        subject: ctx.input.subject,
        preheader: ctx.input.preheader,
        replyTo: ctx.input.replyTo
      });
      return {
        output: {
          campaignId: result.createdResourceId,
          message: result.message
        },
        message: `Created campaign **${ctx.input.name}** with ID \`${result.createdResourceId}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.campaignId) {
        throw new Error('campaignId is required when updating a campaign');
      }
      await client.updateCampaign(ctx.input.campaignId, {
        name: ctx.input.name,
        fromName: ctx.input.fromName,
        fromEmail: ctx.input.fromEmail,
        subject: ctx.input.subject,
        preheader: ctx.input.preheader,
        replyTo: ctx.input.replyTo
      });
      return {
        output: {
          campaignId: ctx.input.campaignId,
          message: 'Campaign updated successfully'
        },
        message: `Updated campaign \`${ctx.input.campaignId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.campaignId) {
        throw new Error('campaignId is required when deleting a campaign');
      }
      await client.deleteCampaign(ctx.input.campaignId);
      return {
        output: {
          campaignId: ctx.input.campaignId,
          message: 'Campaign deleted successfully'
        },
        message: `Deleted campaign \`${ctx.input.campaignId}\`.`
      };
    }

    if (ctx.input.action === 'send') {
      if (!ctx.input.campaignId) {
        throw new Error('campaignId is required when sending a campaign');
      }
      if (!ctx.input.sendType) {
        throw new Error('sendType is required when sending a campaign');
      }
      await client.sendCampaign(
        ctx.input.campaignId,
        ctx.input.sendType,
        ctx.input.scheduledDate
      );
      let sendMessage =
        ctx.input.sendType === 'immediate'
          ? `Campaign \`${ctx.input.campaignId}\` sent immediately.`
          : `Campaign \`${ctx.input.campaignId}\` scheduled for ${ctx.input.scheduledDate}.`;
      return {
        output: {
          campaignId: ctx.input.campaignId,
          message: sendMessage
        },
        message: sendMessage
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
